import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'
import { uploadToDrive, deleteFromDrive } from '../utils/googleDriveService.js'

export const getArticles = asyncHandler(async (req, res) => {
  const result = await pool.query("SELECT * FROM articles WHERE status = 'published' ORDER BY published_at DESC")
  res.json({ success: true, data: result.rows })
})

export const getHeroCarouselArticles = asyncHandler(async (req, res) => {
  // Get 5 articles, prioritize pinned, then latest published
  const result = await pool.query(`
    SELECT * FROM articles 
    WHERE status = 'published'
    ORDER BY is_pinned DESC, published_at DESC 
    LIMIT 5
  `)
  res.json({ success: true, data: result.rows })
})

export const getArticleById = asyncHandler(async (req, res) => {
  const { id } = req.params
  const result = await pool.query('SELECT * FROM articles WHERE id = $1', [id])
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Article not found' })
  }
  res.json({ success: true, data: result.rows[0] })
})

export const getAdminArticles = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM articles ORDER BY created_at DESC')
  res.json({ success: true, data: result.rows })
})

export const createArticle = asyncHandler(async (req, res) => {
  const { title, excerpt, content, is_pinned } = req.body
  let featured_image_url = null
  let file_id = null

  if (req.file) {
    const uploadResult = await uploadToDrive(req.file)
    featured_image_url = uploadResult.url
    file_id = uploadResult.fileId
  }

  const result = await pool.query(
    `INSERT INTO articles (title, excerpt, content, featured_image_url, file_id, is_pinned, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
    [title, excerpt, content, featured_image_url, file_id, is_pinned === 'true' || is_pinned === true, req.body.status || 'draft']
  )

  res.status(201).json({ success: true, data: result.rows[0] })
})

export const updateArticle = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { title, excerpt, content, is_pinned } = req.body

  // First get existing article to check for file replacement
  const existing = await pool.query('SELECT * FROM articles WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Article not found' })
  }

  let featured_image_url = existing.rows[0].featured_image_url
  let file_id = existing.rows[0].file_id

  if (req.file) {
    if (file_id) {
      await deleteFromDrive(file_id)
    }
    const uploadResult = await uploadToDrive(req.file)
    featured_image_url = uploadResult.url
    file_id = uploadResult.fileId
  }

  const result = await pool.query(
    `UPDATE articles SET title=$1, excerpt=$2, content=$3, featured_image_url=$4, file_id=$5, is_pinned=$6, status=$7, updated_at=NOW()
     WHERE id=$8 RETURNING *`,
    [title, excerpt, content, featured_image_url, file_id, is_pinned === 'true' || is_pinned === true, req.body.status || 'draft', id]
  )

  res.json({ success: true, data: result.rows[0] })
})

export const deleteArticle = asyncHandler(async (req, res) => {
  const { id } = req.params
  
  const existing = await pool.query('SELECT * FROM articles WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Article not found' })
  }

  if (existing.rows[0].file_id) {
    await deleteFromDrive(existing.rows[0].file_id)
  }

  await pool.query('DELETE FROM articles WHERE id = $1', [id])

  res.json({ success: true, message: 'Article deleted successfully' })
})
