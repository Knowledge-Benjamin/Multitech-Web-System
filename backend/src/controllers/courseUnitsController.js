import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

// GET all course units (optionally filtered by programme)
export const getCourseUnits = asyncHandler(async (req, res) => {
  const { programme_id } = req.query
  let query = `
    SELECT c.id, c.course_code, c.name, c.credits, c.target_year, c.target_semester, c.modules,
           p.id as programme_id, p.name as programme_name
    FROM courses c
    LEFT JOIN programmes p ON c.programme_id = p.id
  `
  const params = []
  if (programme_id) {
    query += ' WHERE c.programme_id = $1'
    params.push(programme_id)
  }
  query += ' ORDER BY c.target_year ASC, c.target_semester ASC, c.course_code ASC'
  const result = await pool.query(query, params)
  res.json({ success: true, data: result.rows })
})

// GET single course unit
export const getCourseUnit = asyncHandler(async (req, res) => {
  const { id } = req.params
  const result = await pool.query(
    `SELECT c.*, p.name as programme_name FROM courses c LEFT JOIN programmes p ON c.programme_id = p.id WHERE c.id = $1`,
    [id]
  )
  if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Course unit not found' })
  res.json({ success: true, data: result.rows[0] })
})

// CREATE a course unit
export const createCourseUnit = asyncHandler(async (req, res) => {
  const { programme_id, course_code, name, credits, target_year, target_semester, modules } = req.body;

  if (!programme_id || !course_code || !name) {
    return res.status(400).json({ success: false, message: 'Programme, course code, and name are required.' })
  }

  // Check for duplicate code within programme
  const existing = await pool.query(
    'SELECT id FROM courses WHERE course_code = $1 AND programme_id = $2',
    [course_code.trim().toUpperCase(), programme_id]
  )
  if (existing.rows.length > 0) {
    return res.status(409).json({ success: false, message: `Course code "${course_code}" already exists in this programme.` })
  }

  const result = await pool.query(
    `INSERT INTO courses (programme_id, course_code, name, credits, target_year, target_semester, modules)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [programme_id, course_code.trim().toUpperCase(), name.trim(), credits || 3, target_year || 1, target_semester || 1, JSON.stringify(modules || [])]
  )
  res.status(201).json({ success: true, data: result.rows[0], message: 'Course unit created successfully.' })
})

// UPDATE a course unit
export const updateCourseUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { course_code, name, credits, target_year, target_semester, modules } = req.body;

  const result = await pool.query(
    `UPDATE courses SET course_code = $1, name = $2, credits = $3, target_year = $4, target_semester = $5, modules = $6, updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [course_code?.trim().toUpperCase(), name?.trim(), credits, target_year, target_semester, JSON.stringify(modules || []), id]
  )
  if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Course unit not found.' })
  res.json({ success: true, data: result.rows[0], message: 'Course unit updated.' })
})

// DELETE a course unit
export const deleteCourseUnit = asyncHandler(async (req, res) => {
  const { id } = req.params
  await pool.query('DELETE FROM courses WHERE id = $1', [id])
  res.json({ success: true, message: 'Course unit deleted.' })
})
