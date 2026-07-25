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

// Enroll student in a term (create student_term_enrollment)
export const enrollStudentInTerm = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { academic_term_id, study_year, study_semester } = req.body

  if (!academic_term_id || !study_year || !study_semester) {
    return res.status(400).json({ success: false, message: 'academic_term_id, study_year, and study_semester are required.' })
  }

  // Check student exists
  const studentCheck = await pool.query('SELECT id FROM students WHERE id = $1', [id])
  if (studentCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found.' })

  const result = await pool.query(`
    INSERT INTO student_term_enrollments (student_id, academic_term_id, study_year, study_semester, progression_status)
    VALUES ($1, $2, $3, $4, 'normal')
    ON CONFLICT (student_id, academic_term_id) DO NOTHING
    RETURNING *
  `, [id, academic_term_id, study_year, study_semester])

  if (result.rows.length === 0) {
    return res.status(409).json({ success: false, message: 'Student is already enrolled in this term.' })
  }

  res.status(201).json({ success: true, data: result.rows[0], message: 'Student enrolled in term successfully.' })
})

// Get course registrations for a student's specific enrollment
export const getCourseRegistrations = asyncHandler(async (req, res) => {
  const { enrollmentId } = req.params

  const { rows } = await pool.query(`
    SELECT cr.id, cr.status, cr.type, c.course_code, c.name as course_name, c.credits, c.target_year, c.target_semester
    FROM course_registrations cr
    JOIN courses c ON cr.course_id = c.id
    WHERE cr.student_term_enrollment_id = $1
    ORDER BY c.target_year, c.target_semester, c.course_code
  `, [enrollmentId])

  res.json({ success: true, data: rows })
})

// Register student for specific courses in an enrollment
export const registerCourses = asyncHandler(async (req, res) => {
  const { enrollmentId } = req.params
  const { course_ids } = req.body // array of course IDs

  if (!Array.isArray(course_ids) || course_ids.length === 0) {
    return res.status(400).json({ success: false, message: 'course_ids must be a non-empty array.' })
  }

  // Verify enrollment exists
  const enrollCheck = await pool.query('SELECT id FROM student_term_enrollments WHERE id = $1', [enrollmentId])
  if (enrollCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Enrollment not found.' })

  let inserted = 0, skipped = 0
  for (const course_id of course_ids) {
    const result = await pool.query(`
      INSERT INTO course_registrations (student_term_enrollment_id, course_id, type, status)
      VALUES ($1, $2, 'first_attempt', 'registered')
      ON CONFLICT (student_term_enrollment_id, course_id) DO NOTHING
      RETURNING id
    `, [enrollmentId, course_id])
    if (result.rows.length > 0) inserted++; else skipped++
  }

  res.status(201).json({ success: true, message: `Registered ${inserted} course(s). ${skipped} already existed.` })
})

// Remove a course registration
export const removeCourseRegistration = asyncHandler(async (req, res) => {
  const { registrationId } = req.params
  await pool.query('DELETE FROM course_registrations WHERE id = $1', [registrationId])
  res.json({ success: true, message: 'Course registration removed.' })
})
