import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

// Get all enrolled students (Admin)
export const getStudents = asyncHandler(async (req, res) => {
  const { status, programme_id, search } = req.query
  const requestedPage = Number.parseInt(req.query.page, 10)
  const requestedLimit = Number.parseInt(req.query.limit, 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 100)
    : 10

  const filters = []
  const filterParams = []
  let filterIndex = 1

  if (status) {
    filters.push(`s.current_status = $${filterIndex++}`)
    filterParams.push(status)
  }
  if (programme_id) {
    filters.push(`s.programme_id = $${filterIndex++}`)
    filterParams.push(programme_id)
  }
  if (search) {
    filters.push(`(a.first_name ILIKE $${filterIndex} OR a.last_name ILIKE $${filterIndex} OR s.student_number ILIKE $${filterIndex} OR sa.email ILIKE $${filterIndex})`)
    filterParams.push(`%${search}%`)
    filterIndex++
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const offset = (page - 1) * limit
  const query = `
    SELECT s.id, s.student_number, s.current_status, s.programme_id,
           p.name AS programme_name, a.first_name, a.last_name, a.phone,
           a.passport_photo_url, sa.email,
           (
             SELECT t.name
             FROM student_term_enrollments ste
             JOIN academic_terms t ON ste.academic_term_id = t.id
             WHERE ste.student_id = s.id
             ORDER BY t.start_date DESC
             LIMIT 1
           ) AS current_term_name,
           (
             SELECT ste.study_year
             FROM student_term_enrollments ste
             JOIN academic_terms t ON ste.academic_term_id = t.id
             WHERE ste.student_id = s.id
             ORDER BY t.start_date DESC
             LIMIT 1
           ) AS current_study_year,
           (
             SELECT ste.study_semester
             FROM student_term_enrollments ste
             JOIN academic_terms t ON ste.academic_term_id = t.id
             WHERE ste.student_id = s.id
             ORDER BY t.start_date DESC
             LIMIT 1
           ) AS current_study_semester
    FROM students s
    JOIN programmes p ON s.programme_id = p.id
    JOIN student_accounts sa ON s.student_account_id = sa.id
    JOIN applications a ON sa.application_id = a.id
    ${whereClause}
    ORDER BY s.created_at DESC, s.id DESC
    LIMIT $${filterIndex} OFFSET $${filterIndex + 1}
  `
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM students s
    JOIN student_accounts sa ON s.student_account_id = sa.id
    JOIN applications a ON sa.application_id = a.id
    ${whereClause}
  `
  const statusCountsQuery = `
    SELECT current_status, COUNT(*)::int AS count
    FROM students
    GROUP BY current_status
  `
  const [result, countResult, statusCountsResult] = await Promise.all([
    pool.query(query, [...filterParams, limit, offset]),
    pool.query(countQuery, filterParams),
    pool.query(statusCountsQuery)
  ])
  const total = Number(countResult.rows[0].total)
  const totalPages = Math.ceil(total / limit)

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    },
    statusCounts: statusCountsResult.rows.reduce((counts, row) => {
      counts[row.current_status || 'unknown'] = row.count
      return counts
    }, {})
  })
})

// Get a single student's complete profile
export const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params

  // 1. Basic Student Info
  const studentRes = await pool.query(`
    SELECT s.*, p.name AS programme_name, a.first_name, a.last_name, a.gender,
           a.date_of_birth, a.passport_photo_url, a.nationality,
           a.country_of_residence, a.address, a.town, a.county,
           sa.email, a.phone
    FROM students s
    JOIN programmes p ON s.programme_id = p.id
    JOIN student_accounts sa ON s.student_account_id = sa.id
    JOIN applications a ON sa.application_id = a.id
    WHERE s.id = $1
  `, [id])

  if (studentRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' })
  const student = studentRes.rows[0]

  const [enrollmentsRes, invoicesRes, paymentsRes, attendanceRes, academicRes] = await Promise.all([
    pool.query(`
      SELECT ste.*, t.name AS term_name, y.name AS year_name
      FROM student_term_enrollments ste
      JOIN academic_terms t ON ste.academic_term_id = t.id
      JOIN academic_years y ON t.academic_year_id = y.id
      WHERE ste.student_id = $1
      ORDER BY t.start_date DESC
    `, [id]),
    pool.query(`
      SELECT i.*, t.name AS term_name
      FROM invoices i
      LEFT JOIN academic_terms t ON i.academic_term_id = t.id
      WHERE i.student_id = $1
      ORDER BY i.created_at DESC
    `, [id]),
    pool.query(`
      SELECT * FROM payments WHERE student_id = $1 ORDER BY payment_date DESC
    `, [id]),
    pool.query(`
      SELECT
        COUNT(DISTINCT cs.id)::int AS total_sessions,
        COUNT(DISTINCT ar.session_id)::int AS attended_sessions
      FROM course_registrations cr
      JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
      JOIN class_schedules sch ON cr.course_id = sch.course_id
      JOIN class_sessions cs ON sch.id = cs.schedule_id
      LEFT JOIN attendance_records ar
        ON cs.id = ar.session_id AND ar.student_id = $1 AND ar.status = 'Present'
      WHERE ste.student_id = $1
        AND (cs.status = 'ended' OR cs.end_time IS NOT NULL)
    `, [id]),
    pool.query(`
      SELECT
        COUNT(*)::int AS result_count,
        COALESCE(SUM(COALESCE(NULLIF(c.credits, 0), 3)), 0) AS credits_attempted,
        COALESCE(SUM(
          CASE
            WHEN COALESCE(g.final_score, 0) >= 80 THEN 5.0
            WHEN COALESCE(g.final_score, 0) >= 70 THEN 4.0
            WHEN COALESCE(g.final_score, 0) >= 60 THEN 3.0
            WHEN COALESCE(g.final_score, 0) >= 50 THEN 2.0
            WHEN COALESCE(g.final_score, 0) >= 40 THEN 1.0
            ELSE 0.0
          END * COALESCE(NULLIF(c.credits, 0), 3)
        ), 0) AS grade_points,
        COALESCE(SUM(
          CASE
            WHEN COALESCE(g.final_score, 0) >= 40 THEN COALESCE(NULLIF(c.credits, 0), 3)
            ELSE 0
          END
        ), 0) AS credits_earned
      FROM grades g
      JOIN course_registrations cr ON g.course_registration_id = cr.id
      JOIN courses c ON cr.course_id = c.id
      JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
      WHERE ste.student_id = $1
    `, [id])
  ])
  const attendanceTotals = attendanceRes.rows[0]
  const academicTotals = academicRes.rows[0]
  const creditsAttempted = Number(academicTotals.credits_attempted)

  res.json({
    success: true,
    data: {
      profile: student,
      enrollments: enrollmentsRes.rows,
      invoices: invoicesRes.rows,
      payments: paymentsRes.rows,
      attendanceSummary: {
        totalSessions: attendanceTotals.total_sessions,
        attendedSessions: attendanceTotals.attended_sessions,
        percentage: attendanceTotals.total_sessions > 0
          ? Math.round((attendanceTotals.attended_sessions / attendanceTotals.total_sessions) * 100)
          : null
      },
      academicSummary: {
        gradeRecords: academicTotals.result_count,
        cgpa: academicTotals.result_count > 0 && creditsAttempted > 0
          ? (Number(academicTotals.grade_points) / creditsAttempted).toFixed(2)
          : null,
        creditsAttempted,
        creditsEarned: Number(academicTotals.credits_earned)
      }
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
