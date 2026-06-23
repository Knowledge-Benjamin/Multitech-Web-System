import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

// Get all announcements
export const getAnnouncements = asyncHandler(async (req, res) => {
  const { campus, published } = req.query

  let query = 'SELECT * FROM announcements WHERE 1=1'
  const params = []

  if (campus) {
    query += ' AND campus = $1'
    params.push(campus)
  }

  if (published !== undefined) {
    query += ` AND published = ${campus ? '$2' : '$1'}`
    params.push(published === 'true')
  }

  query += ' ORDER BY created_at DESC LIMIT 50'

  const result = await pool.query(query, params)
  res.json({ success: true, data: result.rows })
})

// Get single announcement
export const getAnnouncementById = asyncHandler(async (req, res) => {
  const { id } = req.params
  const result = await pool.query('SELECT * FROM announcements WHERE id = $1', [id])

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Announcement not found' })
  }

  res.json({ success: true, data: result.rows[0] })
})

// Create announcement (admin)
export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, content, campus, published } = req.body

  const result = await pool.query(
    `INSERT INTO announcements (title, content, campus, published, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [title, content, campus, published || false]
  )

  res.status(201).json({ success: true, data: result.rows[0] })
})

// Update announcement
export const updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { title, content, published } = req.body

  const result = await pool.query(
    `UPDATE announcements
     SET title = $1, content = $2, published = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [title, content, published, id]
  )

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Announcement not found' })
  }

  res.json({ success: true, data: result.rows[0] })
})

// Delete announcement
export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params

  const result = await pool.query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id])

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Announcement not found' })
  }

  res.json({ success: true, message: 'Announcement deleted successfully' })
})
