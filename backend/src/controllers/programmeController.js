import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'
import { uploadToDrive, deleteFromDrive } from '../utils/googleDriveService.js'

const normalizeOptionalInteger = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const normalizeOptionalNumeric = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

// Get all programmes with optional filtering
export const getProgrammes = asyncHandler(async (req, res) => {
  const { type, level, intake_id } = req.query

  let query
  const params = []

  if (intake_id) {
    // Fetching programmes for a specific intake (Apply page)
    query = `SELECT p.*,
      pi.id as programme_intake_id,
      pi.intake_status as live_intake_status,
      (
        SELECT json_agg(cp.campus_id)
        FROM campus_programmes cp
        WHERE cp.programme_id = p.id
      ) AS campus_ids
    FROM programmes p
    JOIN programme_intakes pi ON pi.programme_id = p.id
    WHERE p.active = true AND pi.intake_id = $1 AND pi.intake_status = 'open'`
    params.push(intake_id)
  } else {
    // Public listing — derive live status, faculty_id, and campuses array
    query = `SELECT p.*,
      d.faculty_id,
      (
        SELECT json_agg(cp.campus_id)
        FROM campus_programmes cp
        WHERE cp.programme_id = p.id
      ) AS campus_ids,
      COALESCE(
        (
          SELECT pi.intake_status
          FROM programme_intakes pi
          JOIN intakes i ON i.id = pi.intake_id
          WHERE pi.programme_id = p.id
            AND i.status != 'closed'
          ORDER BY i.created_at DESC
          LIMIT 1
        ),
        'closed'
      ) AS live_intake_status
    FROM programmes p
    LEFT JOIN departments d ON d.id = p.department_id
    WHERE p.active = true`
  }

  if (type) {
    params.push(type)
    query += ` AND p.type = $${params.length}`
  }

  if (level) {
    params.push(level)
    query += ` AND p.level = $${params.length}`
  }

  query += ' ORDER BY p.name ASC'

  const result = await pool.query(query, params)
  res.json({ success: true, data: result.rows })
})

// Get single programme
export const getProgrammeById = asyncHandler(async (req, res) => {
  const { id } = req.params
  const isNumericId = /^\d+$/.test(id)

  // Derive live intake_status from the most recent non-closed intake linked to this programme
  const liveStatusSubquery = `
    COALESCE(
      (
        SELECT pi.intake_status
        FROM programme_intakes pi
        JOIN intakes i ON i.id = pi.intake_id
        WHERE pi.programme_id = p.id
          AND i.status != 'closed'
        ORDER BY i.created_at DESC
        LIMIT 1
      ),
      'closed'
    ) AS live_intake_status
  `

  const campusesSubquery = `
    COALESCE(
      (
        SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
        FROM campus_programmes cp
        JOIN campuses c ON c.id = cp.campus_id
        WHERE cp.programme_id = p.id
      ), '[]'::json
    ) AS campuses
  `

  const result = await pool.query(
    isNumericId
      ? `SELECT p.*, ${liveStatusSubquery}, ${campusesSubquery} FROM programmes p WHERE p.id = $1`
      : `SELECT p.*, ${liveStatusSubquery}, ${campusesSubquery} FROM programmes p WHERE p.active = true AND p.slug = $1`,
    [id]
  )

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Programme not found' })
  }

  res.json({ success: true, data: result.rows[0] })
})

// Create programme (admin only)
export const createProgramme = asyncHandler(async (req, res) => {
  const { 
    name, type, level, description, duration, capacity, tuition_fee,
    requirements, curriculum, career_prospects, intake_status, 
    application_start_date, application_end_date, is_supplementary,
    national_tuition_fee, international_tuition_fee
  } = req.body

  let image_url = null
  let gdrive_file_id = null

  if (req.file) {
    const uploadResult = await uploadToDrive(req.file, 'Programmes')
    image_url = uploadResult.url
    gdrive_file_id = uploadResult.fileId
  }

  const normalizedCapacity = normalizeOptionalInteger(capacity, 50)
  const normalizedTuitionFee = normalizeOptionalNumeric(tuition_fee, null)
  const normalizedNationalTuitionFee = normalizeOptionalNumeric(national_tuition_fee, null)
  const normalizedInternationalTuitionFee = normalizeOptionalNumeric(international_tuition_fee, null)

  const slug = slugify(name)

  const result = await pool.query(
    `INSERT INTO programmes (
       name, type, level, description, duration, capacity, tuition_fee, active, image_url, gdrive_file_id, 
       requirements, curriculum, career_prospects, intake_status, application_start_date, application_end_date,
       is_supplementary, national_tuition_fee, international_tuition_fee, slug, created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
     RETURNING *`,
    [
      name, type, level, description, duration, normalizedCapacity, normalizedTuitionFee ?? normalizedNationalTuitionFee ?? 0, image_url, gdrive_file_id,
      requirements, 
      typeof curriculum === 'string' ? curriculum : JSON.stringify(curriculum || []), 
      career_prospects, intake_status || 'closed', 
      application_start_date || null, application_end_date || null, 
      is_supplementary === 'true' || is_supplementary === true,
      normalizedNationalTuitionFee, normalizedInternationalTuitionFee,
      slug
    ]
  )

  res.status(201).json({ success: true, data: result.rows[0] })
})

// Update programme
export const updateProgramme = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { 
    name, level, description, duration, capacity, tuition_fee, active,
    requirements, curriculum, career_prospects, intake_status, 
    application_start_date, application_end_date, is_supplementary,
    national_tuition_fee, international_tuition_fee
  } = req.body

  // Check existing programme first
  const existing = await pool.query('SELECT * FROM programmes WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Programme not found' })
  }

  let image_url = existing.rows[0].image_url
  let gdrive_file_id = existing.rows[0].gdrive_file_id

  if (req.file) {
    // Delete old image if exists
    if (gdrive_file_id) {
      await deleteFromDrive(gdrive_file_id).catch(err => console.error('Failed to delete old image:', err))
    }
    
    // Upload new image
    const uploadResult = await uploadToDrive(req.file, 'Programmes')
    image_url = uploadResult.url
    gdrive_file_id = uploadResult.fileId
  }

  const existing_row = existing.rows[0]
  const normalizedCapacity = normalizeOptionalInteger(capacity, existing_row.capacity ?? 50)
  const slug = slugify(name || existing_row.name)
  const normalizedTuitionFee = normalizeOptionalNumeric(tuition_fee, null)
  const normalizedNationalTuitionFee = normalizeOptionalNumeric(national_tuition_fee, null)
  const normalizedInternationalTuitionFee = normalizeOptionalNumeric(international_tuition_fee, null)

  // Resolve active: JS-level fallback ensures it is never undefined/null/string "undefined"
  const resolvedActive = (active !== undefined && active !== null && active !== 'undefined')
    ? (active === 'true' || active === true)
    : (existing_row.active ?? true)

  const result = await pool.query(
    `UPDATE programmes
     SET name = COALESCE($1, name),
         level = COALESCE($2, level),
         description = $3,
         duration = $4,
         capacity = $5,
         tuition_fee = $6,
         active = COALESCE($7, active, true),
         image_url = $8,
         gdrive_file_id = $9,
         requirements = $10,
         curriculum = $11,
         career_prospects = $12,
         intake_status = $13,
         application_start_date = $14,
         application_end_date = $15,
         is_supplementary = $16,
         national_tuition_fee = $17,
         international_tuition_fee = $18,
         slug = $19,
         updated_at = NOW()
     WHERE id = $20
     RETURNING *`,
    [
      name || existing_row.name,
      level ?? existing_row.level,
      description,
      duration,
      normalizedCapacity,
      normalizedTuitionFee ?? normalizedNationalTuitionFee ?? existing_row.tuition_fee ?? 0,
      resolvedActive,
      image_url, gdrive_file_id,
      requirements,
      typeof curriculum === 'string' ? curriculum : JSON.stringify(curriculum || []),
      career_prospects,
      intake_status || existing_row.intake_status || 'closed',
      application_start_date || null,
      application_end_date || null,
      is_supplementary === 'true' || is_supplementary === true,
      normalizedNationalTuitionFee ?? existing_row.national_tuition_fee ?? null,
      normalizedInternationalTuitionFee ?? existing_row.international_tuition_fee ?? null,
      slug,
      id
    ]
  )

  res.json({ success: true, data: result.rows[0] })
})

// Delete programme
export const deleteProgramme = asyncHandler(async (req, res) => {
  const { id } = req.params

  const existing = await pool.query('SELECT * FROM programmes WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Programme not found' })
  }

  if (existing.rows[0].gdrive_file_id) {
    await deleteFromDrive(existing.rows[0].gdrive_file_id).catch(err => console.error('Failed to delete image:', err))
  }

  await pool.query('DELETE FROM programmes WHERE id = $1', [id])

  res.json({ success: true, message: 'Programme deleted successfully' })
})

// Update just the programme image
export const updateProgrammeImage = asyncHandler(async (req, res) => {
  const { id } = req.params

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image provided' })
  }

  const existing = await pool.query('SELECT * FROM programmes WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Programme not found' })
  }

  // Delete old image
  if (existing.rows[0].gdrive_file_id) {
    await deleteFromDrive(existing.rows[0].gdrive_file_id).catch(err => console.error('Failed to delete old image:', err))
  }

  // Upload new image
  const uploadResult = await uploadToDrive(req.file, 'Programmes')
  
  const result = await pool.query(
    `UPDATE programmes SET image_url = $1, gdrive_file_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [uploadResult.url, uploadResult.fileId, id]
  )

  res.json({ success: true, data: result.rows[0] })
})
