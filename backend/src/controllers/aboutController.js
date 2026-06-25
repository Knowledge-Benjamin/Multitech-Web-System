import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'
import { uploadToDrive, deleteFromDrive } from '../utils/googleDriveService.js'

const toSlug = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const getAboutHero = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM about_hero ORDER BY updated_at DESC LIMIT 1')
  if (result.rows.length === 0) return res.json({ success: true, data: null })
  res.json({ success: true, data: result.rows[0] })
})

export const getAboutSections = asyncHandler(async (req, res) => {
  const result = await pool.query(
    "SELECT id, title, slug, description, content, section_type, metadata FROM about_sections WHERE status = 'published' ORDER BY display_order ASC, updated_at DESC"
  )
  res.json({ success: true, data: result.rows })
})

export const getAdminAboutSections = asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM about_sections ORDER BY display_order ASC, updated_at DESC'
  )
  res.json({ success: true, data: result.rows })
})

export const createAboutSection = asyncHandler(async (req, res) => {
  const { title, description, content, status, display_order, section_type, metadata } = req.body
  const slug = toSlug(title || '')

  if (!title) return res.status(400).json({ success: false, message: 'Title is required' })

  let parsedMetadata = {}
  if (metadata) {
    parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata
  }

  const result = await pool.query(
    `INSERT INTO about_sections (title, slug, description, content, section_type, metadata, status, display_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [title, slug, description || '', content || '', section_type || 'standard', parsedMetadata, status || 'draft', display_order || 0]
  )

  res.status(201).json({ success: true, data: result.rows[0] })
})

export const updateAboutSection = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { title, description, content, status, display_order, section_type, metadata } = req.body

  const existing = await pool.query('SELECT * FROM about_sections WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Section not found' })
  }

  const slug = title ? toSlug(title) : existing.rows[0].slug
  let parsedMetadata = existing.rows[0].metadata || {}
  if (metadata !== undefined) {
    parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata
  }

  const result = await pool.query(
    `UPDATE about_sections
     SET title = COALESCE($1, title),
         slug = $2,
         description = COALESCE($3, description),
         content = COALESCE($4, content),
         section_type = COALESCE($5, section_type),
         metadata = $6,
         status = COALESCE($7, status, 'draft'),
         display_order = COALESCE($8, display_order, display_order),
         updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [title, slug, description, content, section_type || existing.rows[0].section_type, parsedMetadata, status, display_order, id]
  )

  res.json({ success: true, data: result.rows[0] })
})

export const uploadSectionAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No avatar file uploaded' })
  }

  const uploadResult = await uploadToDrive(req.file, 'About Sections')
  res.json({ success: true, data: { url: uploadResult.url, fileId: uploadResult.fileId } })
})

export const deleteAboutSection = asyncHandler(async (req, res) => {
  const { id } = req.params
  const existing = await pool.query('SELECT * FROM about_sections WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Section not found' })
  }

  await pool.query('DELETE FROM about_sections WHERE id = $1', [id])
  res.json({ success: true, message: 'Section deleted' })
})

export const getAdminAbout = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM about_hero ORDER BY updated_at DESC')
  res.json({ success: true, data: result.rows })
})

export const createOrUpdateAbout = asyncHandler(async (req, res) => {
  const { title, excerpt, content } = req.body

  // Fetch existing record (if any)
  const existingRes = await pool.query('SELECT * FROM about_hero ORDER BY updated_at DESC LIMIT 1')
  let featured_image_url = existingRes.rows[0]?.featured_image_url || null
  let file_id = existingRes.rows[0]?.file_id || null

  if (req.file) {
    // If there is an existing file, delete it
    if (file_id) {
      await deleteFromDrive(file_id)
    }
    // Store About hero images in a dedicated subfolder for consistency
    const uploadResult = await uploadToDrive(req.file, 'About Hero')
    featured_image_url = uploadResult.url
    file_id = uploadResult.fileId
  }

  if (existingRes.rows.length === 0) {
    const insertRes = await pool.query(
      `INSERT INTO about_hero (title, excerpt, content, featured_image_url, file_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, excerpt, content, featured_image_url, file_id]
    )
    return res.status(201).json({ success: true, data: insertRes.rows[0] })
  } else {
    const id = existingRes.rows[0].id
    const updateRes = await pool.query(
      `UPDATE about_hero SET title=$1, excerpt=$2, content=$3, featured_image_url=$4, file_id=$5, updated_at=NOW() WHERE id=$6 RETURNING *`,
      [title, excerpt, content, featured_image_url, file_id, id]
    )
    return res.json({ success: true, data: updateRes.rows[0] })
  }
})

export const deleteAbout = asyncHandler(async (req, res) => {
  const existingRes = await pool.query('SELECT * FROM about_hero ORDER BY updated_at DESC LIMIT 1')
  if (existingRes.rows.length === 0) return res.status(404).json({ success: false, message: 'About hero not found' })
  const file_id = existingRes.rows[0].file_id
  if (file_id) await deleteFromDrive(file_id)
  await pool.query('DELETE FROM about_hero WHERE id = $1', [existingRes.rows[0].id])
  res.json({ success: true, message: 'About hero removed' })
})

export default {
  getAboutHero,
  getAboutSections,
  getAdminAboutSections,
  createAboutSection,
  updateAboutSection,
  deleteAboutSection,
  getAdminAbout,
  createOrUpdateAbout,
  deleteAbout
}
