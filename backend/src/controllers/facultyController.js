import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'
import { uploadToDrive, deleteFromDrive } from '../utils/googleDrive.js'

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

export const getFaculties = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM faculties WHERE status = $1 ORDER BY display_order ASC, name ASC', ['active'])
  res.json({ success: true, data: result.rows })
})

export const getAdminFaculties = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM faculties ORDER BY display_order ASC, name ASC')
  res.json({ success: true, data: result.rows })
})

export const createFaculty = asyncHandler(async (req, res) => {
  const { name, description, dean_name, status, display_order } = req.body
  let featured_image_url = null
  let file_id = null

  if (req.file) {
    const uploadResult = await uploadToDrive(req.file, 'Faculties')
    featured_image_url = uploadResult.url
    file_id = uploadResult.fileId
  }

  const slug = slugify(name)
  const resolvedStatus = status || 'active'
  const order = display_order ? parseInt(display_order) : 0
  
  const result = await pool.query(
    `INSERT INTO faculties (name, slug, description, dean_name, status, display_order, featured_image_url, file_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
    [name, slug, description, dean_name, resolvedStatus, order, featured_image_url, file_id]
  )
  res.status(201).json({ success: true, data: result.rows[0] })
})

export const updateFaculty = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { name, description, dean_name, status, display_order } = req.body
  
  const existing = await pool.query('SELECT * FROM faculties WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Faculty not found' })
  }
  
  let featured_image_url = existing.rows[0].featured_image_url
  let file_id = existing.rows[0].file_id

  if (req.file) {
    if (file_id) {
      await deleteFromDrive(file_id).catch(err => console.error('Failed to delete old image:', err))
    }
    const uploadResult = await uploadToDrive(req.file, 'Faculties')
    featured_image_url = uploadResult.url
    file_id = uploadResult.fileId
  }

  const existing_row = existing.rows[0]
  const slug = slugify(name || existing_row.name)
  const resolvedStatus = status || existing_row.status
  const order = display_order !== undefined ? parseInt(display_order) : existing_row.display_order
    
  const result = await pool.query(
    `UPDATE faculties
     SET name = COALESCE($1, name),
         slug = $2,
         description = $3,
         dean_name = $4,
         status = $5,
         display_order = $6,
         featured_image_url = $7,
         file_id = $8,
         updated_at = NOW()
     WHERE id = $9 RETURNING *`,
    [name || existing_row.name, slug, description, dean_name, resolvedStatus, order, featured_image_url, file_id, id]
  )
  res.json({ success: true, data: result.rows[0] })
})

export const deleteFaculty = asyncHandler(async (req, res) => {
  const { id } = req.params
  const existing = await pool.query('SELECT * FROM faculties WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Faculty not found' })
  }

  if (existing.rows[0].file_id) {
    await deleteFromDrive(existing.rows[0].file_id).catch(err => console.error('Failed to delete image:', err))
  }

  await pool.query('DELETE FROM faculties WHERE id = $1', [id])
  res.json({ success: true, message: 'Faculty deleted successfully' })
})
