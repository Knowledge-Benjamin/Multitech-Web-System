import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'
import crypto from 'crypto'

export const getMyProfile = asyncHandler(async (req, res) => {
  const { studentId, applicationId } = req.student

  // 1. Fetch Application Info & Choices
  let applicationInfo = null
  let applicationChoices = []
  
  if (applicationId) {
    const appRes = await pool.query(`
      SELECT a.*, i.name as intake_name
      FROM applications a
      JOIN intakes i ON a.intake_id = i.id
      WHERE a.id = $1
    `, [applicationId])
    applicationInfo = appRes.rows[0]

    if (applicationInfo) {
      const choicesRes = await pool.query(`
        SELECT ac.*, p.name as programme_name, c.name as campus_name
        FROM application_choices ac
        JOIN programme_intakes pi ON ac.programme_intake_id = pi.id
        JOIN programmes p ON pi.programme_id = p.id
        LEFT JOIN campuses c ON ac.campus_id = c.id
        WHERE ac.application_id = $1
        ORDER BY ac.preference_order ASC
      `, [applicationId])
      applicationChoices = choicesRes.rows
    }
  }

  // If no studentId, they are just an applicant
  if (!studentId) {
    return res.json({
      success: true,
      data: {
        isApplicantOnly: true,
        applicationInfo,
        applicationChoices
      }
    })
  }

  // 1. Basic Student Info
  const studentRes = await pool.query(`
    SELECT s.*, p.name AS programme_name, a.first_name, a.last_name, a.gender, a.date_of_birth, sa.email, a.phone
    FROM students s
    JOIN programmes p ON s.programme_id = p.id
    JOIN student_accounts sa ON s.student_account_id = sa.id
    JOIN applications a ON sa.application_id = a.id
    WHERE s.id = $1
  `, [studentId])

  const profile = studentRes.rows[0]

  // 2. Current Enrollment
  const currentEnrollmentRes = await pool.query(`
    SELECT ste.*, t.name AS term_name, y.name AS year_name 
    FROM student_term_enrollments ste
    JOIN academic_terms t ON ste.academic_term_id = t.id
    JOIN academic_years y ON t.academic_year_id = y.id
    WHERE ste.student_id = $1
    ORDER BY t.start_date DESC LIMIT 1
  `, [studentId])

  const currentEnrollment = currentEnrollmentRes.rows[0]

  // 3. Financials (Outstanding Balance)
  const invoicesRes = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) AS total_invoiced, currency
    FROM invoices 
    WHERE student_id = $1 AND status != 'paid' AND status != 'void'
    GROUP BY currency
  `, [studentId])

  const paymentsRes = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) AS total_paid, currency
    FROM payments 
    WHERE student_id = $1
    GROUP BY currency
  `, [studentId])

  let totalDue = 0
  let currency = 'UGX'

  if (invoicesRes.rows.length > 0) {
    currency = invoicesRes.rows[0].currency
    totalDue = parseFloat(invoicesRes.rows[0].total_invoiced)
    
    // Subtract total paid
    const paidMatch = paymentsRes.rows.find(p => p.currency === currency)
    if (paidMatch) {
      totalDue -= parseFloat(paidMatch.total_paid)
    }
  }

  res.json({
    success: true,
    data: {
      profile,
      currentEnrollment,
      applicationInfo,
      applicationChoices,
      financials: {
        currency,
        totalDue: Math.max(0, totalDue) // Don't show negative due if overpaid
      }
    }
  })
})

export const getMyInvoices = asyncHandler(async (req, res) => {
  const { studentId } = req.student
  
  if (!studentId) {
    return res.status(404).json({ success: false, message: 'Student record not found.' })
  }

  // 1. Fetch Invoices
  const invoicesResult = await pool.query(
    `SELECT i.*, t.name as term_name 
     FROM invoices i 
     LEFT JOIN academic_terms t ON i.academic_term_id = t.id 
     WHERE i.student_id = $1 
     ORDER BY i.created_at DESC`,
    [studentId]
  )
  const invoices = invoicesResult.rows

  // 2. Fetch Payments to compute totals
  const paymentsResult = await pool.query(
    'SELECT SUM(amount) as total_paid FROM payments WHERE student_id = $1',
    [studentId]
  )
  const totalPaid = Number(paymentsResult.rows[0].total_paid) || 0

  // 3. Compute Total Billed
  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0)

  // 4. Compute Outstanding Balance
  const outstandingBalance = totalBilled - totalPaid
  
  // 5. Cleared for Exams if balance is <= 0
  const isClearedForExams = outstandingBalance <= 0

  res.json({
    success: true,
    data: {
      invoices,
      summary: {
        totalBilled,
        totalPaid,
        outstandingBalance,
        isClearedForExams
      }
    }
  })
})

export const generateExamPin = asyncHandler(async (req, res) => {
  const { studentId } = req.student
  if (!studentId) return res.status(404).json({ success: false, message: 'Student record not found.' })

  // Ensure one active PIN per student
  const pin = crypto.randomInt(100000, 999999).toString() // 6 digits
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour validity

  // Clear existing PINs for the student
  await pool.query('DELETE FROM student_exam_pins WHERE student_id = $1', [studentId])

  // Insert new PIN
  await pool.query(
    'INSERT INTO student_exam_pins (student_id, pin, expires_at) VALUES ($1, $2, $3)',
    [studentId, pin, expiresAt]
  )

  res.json({ success: true, pin, expiresAt })
})

// === NEW: Get Attendance Stats ===
export const getAttendanceStats = asyncHandler(async (req, res) => {
  const { studentId } = req.student
  if (!studentId) return res.status(404).json({ success: false, message: 'Student record not found.' })
  
  // Get all completed sessions for courses the student is registered for
  const query = `
    SELECT 
      c.course_code, 
      c.name as course_name,
      COUNT(cs.id) as total_sessions,
      COUNT(ar.student_id) as attended_sessions
    FROM course_registrations cr
    JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
    JOIN class_schedules sch ON cr.course_id = sch.course_id
    JOIN class_sessions cs ON sch.id = cs.schedule_id
    JOIN courses c ON cr.course_id = c.id
    LEFT JOIN attendance_records ar ON cs.id = ar.session_id AND ar.student_id = $1 AND ar.status = 'Present'
    WHERE ste.student_id = $1 AND cs.end_time IS NOT NULL
    GROUP BY c.course_code, c.name
  `
  const { rows } = await pool.query(query, [studentId])
  
  // Calculate percentage
  const stats = rows.map(r => ({
    courseCode: r.course_code,
    courseName: r.course_name,
    total: parseInt(r.total_sessions),
    attended: parseInt(r.attended_sessions),
    percentage: parseInt(r.total_sessions) > 0 ? Math.round((parseInt(r.attended_sessions) / parseInt(r.total_sessions)) * 100) : 0
  }))

  res.json({ success: true, data: { stats } })
})

export const getAttendanceDrilldown = asyncHandler(async (req, res) => {
  const { studentId } = req.student
  const { courseCode } = req.params

  if (!studentId) return res.status(404).json({ success: false, message: 'Student record not found.' })
  
  const query = `
    SELECT 
      cs.id as session_id,
      cs.date,
      cs.start_time,
      cs.end_time,
      sch.room,
      sch.day_of_week,
      COALESCE(ar.status, 'Absent') as status,
      c.course_code,
      c.name as course_name
    FROM class_schedules sch
    JOIN class_sessions cs ON sch.id = cs.schedule_id
    JOIN courses c ON sch.course_id = c.id
    JOIN course_registrations cr ON cr.course_id = c.id
    JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
    LEFT JOIN attendance_records ar ON cs.id = ar.session_id AND ar.student_id = $1
    WHERE ste.student_id = $1 AND c.course_code = $2 AND cs.end_time IS NOT NULL
    ORDER BY cs.date DESC, cs.start_time DESC
  `
  
  const { rows } = await pool.query(query, [studentId, courseCode])
  res.json({ success: true, data: rows })
})

export const getMyCoursesMaterials = asyncHandler(async (req, res) => {
  const { studentId } = req.student

  if (!studentId) {
    return res.status(404).json({ success: false, message: 'Student record not found' })
  }

  const activeTermsRes = await pool.query(
    'SELECT id, name FROM academic_terms WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1'
  )
  if (activeTermsRes.rows.length === 0) {
    return res.json({ success: true, data: [] })
  }
  const currentTermId = activeTermsRes.rows[0].id

  const { rows } = await pool.query(`
    SELECT 
      c.id as course_id,
      c.course_code,
      c.name as course_name,
      cm.id as material_id,
      cm.title,
      cm.description,
      cm.drive_file_url,
      cm.file_type,
      cm.created_at as uploaded_at,
      l.first_name || ' ' || l.last_name as lecturer_name
    FROM course_registrations cr
    JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
    JOIN courses c ON cr.course_id = c.id
    JOIN course_materials cm ON cm.course_id = c.id AND cm.academic_term_id = ste.academic_term_id
    JOIN lecturers l ON cm.lecturer_id = l.id
    WHERE ste.student_id = $1 AND ste.academic_term_id = $2
    ORDER BY c.course_code, cm.created_at DESC
  `, [studentId, currentTermId])

  // Group by course
  const grouped = rows.reduce((acc, row) => {
    const key = row.course_id
    if (!acc[key]) {
      acc[key] = {
        course_id: row.course_id,
        course_code: row.course_code,
        course_name: row.course_name,
        materials: []
      }
    }
    acc[key].materials.push({
      id: row.material_id,
      title: row.title,
      description: row.description,
      url: row.drive_file_url,
      file_type: row.file_type,
      uploaded_at: row.uploaded_at,
      lecturer_name: row.lecturer_name
    })
    return acc
  }, {})

  res.json({ success: true, data: Object.values(grouped) })
})

// ---------------------------------------------------------
// My Timetable
// ---------------------------------------------------------

export const getMyTimetable = asyncHandler(async (req, res) => {
  const { studentId } = req.student
  if (!studentId) return res.status(404).json({ success: false, message: 'Student not found' })

  // 1. Get active term for the student
  const activeTermRes = await pool.query(
    `SELECT academic_term_id FROM student_term_enrollments WHERE student_id = $1 AND progression_status = 'normal'`,
    [studentId]
  )
  if (activeTermRes.rows.length === 0) {
    return res.json({ success: true, data: [] })
  }
  const termId = activeTermRes.rows[0].academic_term_id

  // 2. Get registered course IDs
  const courseRes = await pool.query(
    `SELECT cr.course_id
     FROM course_registrations cr
     JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
     WHERE ste.student_id = $1 AND cr.status = 'registered'`,
    [studentId]
  )
  const courseIds = courseRes.rows.map(r => r.course_id)

  if (courseIds.length === 0) {
    return res.json({ success: true, data: [] })
  }

  // 3. Get class schedules
  const placeholders = courseIds.map((_, i) => `$${i + 2}`).join(', ')
  const schedulesRes = await pool.query(
    `SELECT 
      cs.id,
      cs.day_of_week,
      cs.start_time,
      cs.end_time,
      c.course_code,
      c.name as course_name,
      r.name as room_name,
      r.building,
      l.first_name || ' ' || l.last_name as lecturer_name_new,
      au.username as lecturer_name_old
     FROM class_schedules cs
     JOIN courses c ON cs.course_id = c.id
     JOIN rooms r ON cs.room_id = r.id
     LEFT JOIN lecturers l ON cs.lecturer_table_id = l.id
     LEFT JOIN admin_users au ON cs.lecturer_id = au.id
     WHERE cs.academic_term_id = $1 AND cs.course_id IN (${placeholders})
     ORDER BY cs.day_of_week, cs.start_time ASC`,
    [termId, ...courseIds]
  )

  const formattedSchedules = schedulesRes.rows.map(s => ({
    ...s,
    lecturer_name: s.lecturer_name_new || s.lecturer_name_old || 'TBA'
  }))

  res.json({ success: true, data: formattedSchedules })
})

// ---------------------------------------------------------
// My Enrollments
// ---------------------------------------------------------

export const getMyEnrollments = asyncHandler(async (req, res) => {
  const { studentId } = req.student
  if (!studentId) return res.status(404).json({ success: false, message: 'Student not found' })

  const { rows } = await pool.query(`
    SELECT 
      cr.id as registration_id,
      cr.status as registration_status,
      cr.type as registration_type,
      c.course_code,
      c.name as course_name,
      c.credits,
      c.target_year,
      c.target_semester,
      c.modules,
      t.name as term_name
    FROM course_registrations cr
    JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
    JOIN courses c ON cr.course_id = c.id
    JOIN academic_terms t ON ste.academic_term_id = t.id
    WHERE ste.student_id = $1
    ORDER BY t.start_date DESC, c.course_code ASC
  `, [studentId])

  res.json({ success: true, data: rows })
})

// ---------------------------------------------------------
// My Announcements
// ---------------------------------------------------------

export const getMyAnnouncements = asyncHandler(async (req, res) => {
  const { studentId } = req.student
  if (!studentId) return res.status(404).json({ success: false, message: 'Student not found' })

  const { rows } = await pool.query(`
    SELECT 
      ca.id,
      ca.title,
      ca.body,
      ca.created_at,
      c.course_code,
      c.name as course_name,
      l.first_name || ' ' || l.last_name as lecturer_name
    FROM course_announcements ca
    JOIN courses c ON ca.course_id = c.id
    LEFT JOIN lecturers l ON ca.lecturer_id = l.id
    JOIN course_registrations cr ON cr.course_id = c.id
    JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
    WHERE ste.student_id = $1 AND cr.status = 'registered'
    ORDER BY ca.created_at DESC
  `, [studentId])

  res.json({ success: true, data: rows })
})
