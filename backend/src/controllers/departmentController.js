import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

export const getDepartments = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM departments WHERE status = $1 ORDER BY display_order ASC, name ASC', ['active'])
  res.json({ success: true, data: result.rows })
})

export const getAdminDepartments = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM departments ORDER BY display_order ASC, name ASC')
  res.json({ success: true, data: result.rows })
})

export const createDepartment = asyncHandler(async (req, res) => {
  const { faculty_id, name, description, hod_name, status, display_order } = req.body
  const slug = slugify(name)
  const resolvedStatus = status || 'active'
  const order = display_order ? parseInt(display_order) : 0
  
  const result = await pool.query(
    `INSERT INTO departments (faculty_id, name, slug, description, hod_name, status, display_order, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
    [faculty_id, name, slug, description, hod_name, resolvedStatus, order]
  )
  res.status(201).json({ success: true, data: result.rows[0] })
})

export const updateDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { faculty_id, name, description, hod_name, status, display_order } = req.body
  
  const existing = await pool.query('SELECT * FROM departments WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Department not found' })
  }
  
  const existing_row = existing.rows[0]
  const slug = slugify(name || existing_row.name)
  const resolvedStatus = status || existing_row.status
  const order = display_order !== undefined ? parseInt(display_order) : existing_row.display_order
    
  const result = await pool.query(
    `UPDATE departments
     SET faculty_id = COALESCE($1, faculty_id),
         name = COALESCE($2, name),
         slug = $3,
         description = $4,
         hod_name = $5,
         status = $6,
         display_order = $7,
         updated_at = NOW()
     WHERE id = $8 RETURNING *`,
    [faculty_id || existing_row.faculty_id, name || existing_row.name, slug, description, hod_name, resolvedStatus, order, id]
  )
  res.json({ success: true, data: result.rows[0] })
})

export const deleteDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params
  const existing = await pool.query('SELECT * FROM departments WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Department not found' })
  }
  await pool.query('DELETE FROM departments WHERE id = $1', [id])
  res.json({ success: true, message: 'Department deleted successfully' })
})
