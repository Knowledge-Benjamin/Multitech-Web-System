import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

// Get all enrolled students (Admin)
export const getStudents = asyncHandler(async (req, res) => {
  const { status, programme_id, search } = req.query

  let query = `
    SELECT s.id, s.student_number, s.current_status, p.name AS programme_name,
           a.first_name, a.last_name, sa.email
    FROM students s
    JOIN programmes p ON s.programme_id = p.id
    JOIN student_accounts sa ON s.student_account_id = sa.id
    JOIN applications a ON sa.application_id = a.id
    WHERE 1=1
  `
  const params = []
  let idx = 1

  if (status) { query += ` AND s.current_status = $${idx++}`; params.push(status) }
  if (programme_id) { query += ` AND s.programme_id = $${idx++}`; params.push(programme_id) }
  if (search) {
    query += ` AND (a.first_name ILIKE $${idx} OR a.last_name ILIKE $${idx} OR s.student_number ILIKE $${idx} OR sa.email ILIKE $${idx})`
    params.push(`%${search}%`); idx++
  }

  query += ' ORDER BY s.created_at DESC'

  const result = await pool.query(query, params)
  res.json({ success: true, data: result.rows })
})

// Get a single student's complete profile
export const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params

  // 1. Basic Student Info
  const studentRes = await pool.query(`
    SELECT s.*, p.name AS programme_name, a.first_name, a.last_name, a.gender, a.date_of_birth, sa.email, a.phone
    FROM students s
    JOIN programmes p ON s.programme_id = p.id
    JOIN student_accounts sa ON s.student_account_id = sa.id
    JOIN applications a ON sa.application_id = a.id
    WHERE s.id = $1
  `, [id])

  if (studentRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' })
  const student = studentRes.rows[0]

  // 2. Term Enrollments
  const enrollmentsRes = await pool.query(`
    SELECT ste.*, t.name AS term_name, y.name AS year_name 
    FROM student_term_enrollments ste
    JOIN academic_terms t ON ste.academic_term_id = t.id
    JOIN academic_years y ON t.academic_year_id = y.id
    WHERE ste.student_id = $1
    ORDER BY t.start_date DESC
  `, [id])

  // 3. Financial Invoices
  const invoicesRes = await pool.query(`
    SELECT i.*, t.name AS term_name
    FROM invoices i
    JOIN academic_terms t ON i.academic_term_id = t.id
    WHERE i.student_id = $1
    ORDER BY i.created_at DESC
  `, [id])

  // 4. Payments
  const paymentsRes = await pool.query(`
    SELECT * FROM payments WHERE student_id = $1 ORDER BY payment_date DESC
  `, [id])

  res.json({
    success: true,
    data: {
      profile: student,
      enrollments: enrollmentsRes.rows,
      invoices: invoicesRes.rows,
      payments: paymentsRes.rows
    }
  })
})

// Update student progression status manually (Admin override)
export const updateStudentEnrollmentStatus = asyncHandler(async (req, res) => {
  const { enrollmentId } = req.params
  const { progression_status } = req.body // normal, retake, dead_semester, completed

  const result = await pool.query(
    `UPDATE student_term_enrollments SET progression_status = $1 WHERE id = $2 RETURNING *`,
    [progression_status, enrollmentId]
  )

  if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Enrollment not found' })
  res.json({ success: true, data: result.rows[0] })
})
