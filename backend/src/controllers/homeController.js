import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

export const getHomeCards = asyncHandler(async (req, res) => {
  const result = await pool.query(
    "SELECT id, icon, title, points, display_order FROM home_cards WHERE status = 'published' ORDER BY display_order ASC, updated_at DESC"
  )
  res.json({ success: true, data: result.rows })
})

export const getAdminHomeCards = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM home_cards ORDER BY display_order ASC, updated_at DESC')
  res.json({ success: true, data: result.rows })
})

export const createHomeCard = asyncHandler(async (req, res) => {
  const { icon, title, points, status, display_order } = req.body
  if (!title) return res.status(400).json({ success: false, message: 'Title is required' })
  const parsedPoints = points ? (typeof points === 'string' ? JSON.parse(points) : points) : []

  const result = await pool.query(
    `INSERT INTO home_cards (icon, title, points, status, display_order) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [icon || null, title, parsedPoints, status || 'draft', display_order || 0]
  )

  res.status(201).json({ success: true, data: result.rows[0] })
})

export const updateHomeCard = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { icon, title, points, status, display_order } = req.body

  const existing = await pool.query('SELECT * FROM home_cards WHERE id = $1', [id])
  if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Card not found' })

  const parsedPoints = points !== undefined ? (typeof points === 'string' ? JSON.parse(points) : points) : existing.rows[0].points || []

  const result = await pool.query(
    `UPDATE home_cards SET icon = COALESCE($1, icon), title = COALESCE($2, title), points = $3, status = COALESCE($4, status), display_order = COALESCE($5, display_order, display_order), updated_at = NOW() WHERE id = $6 RETURNING *`,
    [icon, title, parsedPoints, status, display_order, id]
  )

  res.json({ success: true, data: result.rows[0] })
})

export const deleteHomeCard = asyncHandler(async (req, res) => {
  const { id } = req.params
  const existing = await pool.query('SELECT * FROM home_cards WHERE id = $1', [id])
  if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Card not found' })

  await pool.query('DELETE FROM home_cards WHERE id = $1', [id])
  res.json({ success: true, message: 'Card deleted' })
})

export default {
  getHomeCards,
  getAdminHomeCards,
  createHomeCard,
  updateHomeCard,
  deleteHomeCard
}
