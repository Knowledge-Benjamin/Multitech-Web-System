import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'
import { uploadToDrive, deleteFromDrive } from '../utils/googleDriveService.js'

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

export const getCampuses = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM campuses WHERE status = $1 ORDER BY display_order ASC, name ASC', ['active'])
  res.json({ success: true, data: result.rows })
})

export const getAdminCampuses = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM campuses ORDER BY display_order ASC, name ASC')
  res.json({ success: true, data: result.rows })
})

export const getCampusBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params
  
  // Try to find by slug first, fallback to id if slug is a number
  const isNumeric = /^\d+$/.test(slug)
  const query = isNumeric
    ? 'SELECT * FROM campuses WHERE id = $1'
    : 'SELECT * FROM campuses WHERE slug = $1'
    
  const result = await pool.query(query, [slug])
  
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Campus not found' })
  }
  
  const campus = result.rows[0]
  
  // Fetch programmes for this campus
  const progResult = await pool.query(`
    SELECT p.* 
    FROM programmes p
    JOIN campus_programmes cp ON p.id = cp.programme_id
    WHERE cp.campus_id = $1 AND p.active = true
  `, [campus.id])
  
  campus.programmes = progResult.rows
  
  res.json({ success: true, data: campus })
})

export const createCampus = asyncHandler(async (req, res) => {
  const { name, tagline, description, address, city, phone, email, map_embed_url, status, display_order } = req.body
  let featured_image_url = null
  let file_id = null

  if (req.file) {
    const uploadResult = await uploadToDrive(req.file, 'Campuses')
    featured_image_url = uploadResult.url
    file_id = uploadResult.fileId
  }

  const slug = slugify(name)
  const resolvedStatus = status || 'active'
  const order = display_order ? parseInt(display_order) : 0

  const result = await pool.query(
    `INSERT INTO campuses (
       name, slug, tagline, description, address, city, phone, email, map_embed_url, status, display_order, featured_image_url, file_id, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()) RETURNING *`,
    [name, slug, tagline, description, address, city, phone, email, map_embed_url, resolvedStatus, order, featured_image_url, file_id]
  )
  res.status(201).json({ success: true, data: result.rows[0] })
})

export const updateCampus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { name, tagline, description, address, city, phone, email, map_embed_url, status, display_order } = req.body

  const existing = await pool.query('SELECT * FROM campuses WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Campus not found' })
  }

  let featured_image_url = existing.rows[0].featured_image_url
  let file_id = existing.rows[0].file_id

  if (req.file) {
    if (file_id) {
      await deleteFromDrive(file_id).catch(err => console.error('Failed to delete old image:', err))
    }
    const uploadResult = await uploadToDrive(req.file, 'Campuses')
    featured_image_url = uploadResult.url
    file_id = uploadResult.fileId
  }

  const existing_row = existing.rows[0]
  const slug = slugify(name || existing_row.name)
  const resolvedStatus = status || existing_row.status
  const order = display_order !== undefined ? parseInt(display_order) : existing_row.display_order

  const result = await pool.query(
    `UPDATE campuses
     SET name = COALESCE($1, name),
         slug = $2,
         tagline = $3,
         description = $4,
         address = $5,
         city = $6,
         phone = $7,
         email = $8,
         map_embed_url = $9,
         status = $10,
         display_order = $11,
         featured_image_url = $12,
         file_id = $13,
         updated_at = NOW()
     WHERE id = $14 RETURNING *`,
    [name || existing_row.name, slug, tagline, description, address, city, phone, email, map_embed_url, resolvedStatus, order, featured_image_url, file_id, id]
  )

  res.json({ success: true, data: result.rows[0] })
})

export const deleteCampus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const existing = await pool.query('SELECT * FROM campuses WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Campus not found' })
  }

  if (existing.rows[0].file_id) {
    await deleteFromDrive(existing.rows[0].file_id).catch(err => console.error('Failed to delete image:', err))
  }

  await pool.query('DELETE FROM campuses WHERE id = $1', [id])
  res.json({ success: true, message: 'Campus deleted successfully' })
})

export const setCampusProgrammes = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { programme_ids } = req.body
  
  await pool.query('DELETE FROM campus_programmes WHERE campus_id = $1', [id])
  if (programme_ids && programme_ids.length > 0) {
    const values = programme_ids.map((pid, i) => `($1, $${i + 2})`).join(', ')
    await pool.query(`INSERT INTO campus_programmes (campus_id, programme_id) VALUES ${values}`, [id, ...programme_ids])
  }
  res.json({ success: true, message: 'Campus programmes updated successfully' })
})
