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
  const { type, level } = req.query

  let query = 'SELECT * FROM programmes WHERE active = true'
  const params = []

  if (type) {
    query += ' AND type = $1'
    params.push(type)
  }

  if (level) {
    query += ` AND level = ${type ? '$2' : '$1'}`
    params.push(level)
  }

  query += ' ORDER BY name ASC'

  const result = await pool.query(query, params)
  res.json({ success: true, data: result.rows })
})

// Get single programme
export const getProgrammeById = asyncHandler(async (req, res) => {
  const { id } = req.params
  const isNumericId = /^\d+$/.test(id)

  const result = await pool.query(
    isNumericId
      ? 'SELECT * FROM programmes WHERE id = $1'
      : 'SELECT * FROM programmes WHERE active = true AND slug = $1',
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
    name, description, duration, capacity, tuition_fee, active,
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
         description = $2,
         duration = $3,
         capacity = $4,
         tuition_fee = $5,
         active = COALESCE($6, active, true),
         image_url = $7,
         gdrive_file_id = $8,
         requirements = $9,
         curriculum = $10,
         career_prospects = $11,
         intake_status = $12,
         application_start_date = $13,
         application_end_date = $14,
         is_supplementary = $15,
         national_tuition_fee = $16,
         international_tuition_fee = $17,
         slug = $18,
         updated_at = NOW()
     WHERE id = $19
     RETURNING *`,
    [
      name || existing_row.name,
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
