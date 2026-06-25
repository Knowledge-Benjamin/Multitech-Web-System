import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

export const getPublicHomeReasons = asyncHandler(async (req, res) => {
  const result = await pool.query("SELECT id, icon, title, points FROM home_reasons WHERE status='published' ORDER BY display_order ASC, updated_at DESC")
  res.json({ success: true, data: result.rows })
})

export const getAdminHomeReasons = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM home_reasons ORDER BY display_order ASC, updated_at DESC')
  res.json({ success: true, data: result.rows })
})

const normalizePoints = (points) => {
  if (points === undefined || points === null) return []
  if (Array.isArray(points)) return points.map((point) => point ?? '').filter((point) => point !== '')
  if (typeof points === 'string') {
    try {
      const parsed = JSON.parse(points)
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return points
        .split(/\r?\n|,\s*/)
        .map((point) => point.trim())
        .filter((point) => point)
    }
  }
  return [String(points)]
}

export const createHomeReason = asyncHandler(async (req, res) => {
  const { icon, title, points, status, display_order } = req.body
  if (!title) return res.status(400).json({ success: false, message: 'Title is required' })
  const normalizedPoints = normalizePoints(points)
  const result = await pool.query(
    `INSERT INTO home_reasons (icon, title, points, status, display_order) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [icon || null, title, JSON.stringify(normalizedPoints), status || 'draft', display_order || 0]
  )
  res.status(201).json({ success: true, data: result.rows[0] })
})

export const updateHomeReason = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { icon, title, points, status, display_order } = req.body
  const existing = await pool.query('SELECT * FROM home_reasons WHERE id=$1', [id])
  if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Reason not found' })
  const normalizedPoints = points !== undefined ? normalizePoints(points) : existing.rows[0].points
  const result = await pool.query(
    `UPDATE home_reasons SET icon=COALESCE($1, icon), title=COALESCE($2, title), points=$3, status=COALESCE($4, status), display_order=COALESCE($5, display_order), updated_at=NOW() WHERE id=$6 RETURNING *`,
    [icon, title, JSON.stringify(normalizedPoints), status, display_order, id]
  )
  res.json({ success: true, data: result.rows[0] })
})

export const deleteHomeReason = asyncHandler(async (req, res) => {
  const { id } = req.params
  const existing = await pool.query('SELECT * FROM home_reasons WHERE id=$1', [id])
  if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Reason not found' })
  await pool.query('DELETE FROM home_reasons WHERE id=$1', [id])
  res.json({ success: true, message: 'Reason deleted' })
})

export default {
  getPublicHomeReasons,
  getAdminHomeReasons,
  createHomeReason,
  updateHomeReason,
  deleteHomeReason
}
