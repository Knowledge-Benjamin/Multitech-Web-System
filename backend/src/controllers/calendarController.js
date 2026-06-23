import pool from '../config/database.js'
import { asyncHandler, validateRequired } from '../utils/helpers.js'

// ---------------------------------------------------------
// Academic Years
// ---------------------------------------------------------

export const getAcademicYears = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM academic_years ORDER BY start_date DESC')
  res.json({ success: true, data: result.rows })
})

export const createAcademicYear = asyncHandler(async (req, res) => {
  const { name, start_date, end_date, status } = req.body

  const validationError = validateRequired(['name', 'start_date', 'end_date'], { name, start_date, end_date })
  if (validationError) return res.status(400).json({ success: false, message: validationError })

  const result = await pool.query(
    `INSERT INTO academic_years (name, start_date, end_date, status) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, start_date, end_date, status || 'upcoming']
  )
  res.status(201).json({ success: true, data: result.rows[0] })
})

export const updateAcademicYear = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { name, start_date, end_date, status } = req.body

  const result = await pool.query(
    `UPDATE academic_years SET name = $1, start_date = $2, end_date = $3, status = $4 WHERE id = $5 RETURNING *`,
    [name, start_date, end_date, status, id]
  )
  
  if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Academic Year not found' })
  res.json({ success: true, data: result.rows[0] })
})

export const deleteAcademicYear = asyncHandler(async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('DELETE FROM academic_years WHERE id = $1', [id])
    res.json({ success: true, message: 'Academic Year deleted' })
  } catch (error) {
    if (error.code === '23503') {
      res.status(400).json({ success: false, message: 'Cannot delete Academic Year because it contains terms/semesters.' })
    } else {
      throw error
    }
  }
})

// ---------------------------------------------------------
// Academic Terms
// ---------------------------------------------------------

export const getAcademicTerms = asyncHandler(async (req, res) => {
  const { year_id } = req.query
  let query = `
    SELECT t.*, y.name as academic_year_name 
    FROM academic_terms t
    JOIN academic_years y ON t.academic_year_id = y.id
  `
  const params = []

  if (year_id) {
    query += ` WHERE t.academic_year_id = $1`
    params.push(year_id)
  }

  query += ` ORDER BY t.start_date DESC`

  const result = await pool.query(query, params)
  res.json({ success: true, data: result.rows })
})

export const createAcademicTerm = asyncHandler(async (req, res) => {
  const { academic_year_id, name, start_date, end_date } = req.body

  const validationError = validateRequired(['academic_year_id', 'name', 'start_date', 'end_date'], { academic_year_id, name, start_date, end_date })
  if (validationError) return res.status(400).json({ success: false, message: validationError })

  const result = await pool.query(
    `INSERT INTO academic_terms (academic_year_id, name, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *`,
    [academic_year_id, name, start_date, end_date]
  )
  res.status(201).json({ success: true, data: result.rows[0] })
})

export const updateAcademicTerm = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { academic_year_id, name, start_date, end_date } = req.body

  const result = await pool.query(
    `UPDATE academic_terms SET academic_year_id = $1, name = $2, start_date = $3, end_date = $4 WHERE id = $5 RETURNING *`,
    [academic_year_id, name, start_date, end_date, id]
  )
  
  if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Academic Term not found' })
  res.json({ success: true, data: result.rows[0] })
})

export const deleteAcademicTerm = asyncHandler(async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('DELETE FROM academic_terms WHERE id = $1', [id])
    res.json({ success: true, message: 'Academic Term deleted' })
  } catch (error) {
    if (error.code === '23503') {
      res.status(400).json({ success: false, message: 'Cannot delete Academic Term because it contains student enrollments or invoices.' })
    } else {
      throw error
    }
  }
})
