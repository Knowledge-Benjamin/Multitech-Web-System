import pool from '../config/database.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { asyncHandler, validateRequired } from '../utils/helpers.js'

// Login admin user
export const loginAdmin = asyncHandler(async (req, res) => {
  const { username, password } = req.body

  const validationError = validateRequired(['username', 'password'], { username, password })
  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError
    })
  }

  const result = await pool.query(
    'SELECT * FROM admin_users WHERE username = $1 AND status = $2',
    [username, 'active']
  )

  if (result.rows.length === 0) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    })
  }

  const admin = result.rows[0]
  const passwordMatch = await bcrypt.compare(password, admin.password)

  if (!passwordMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    })
  }

  const token = jwt.sign(
    { 
      id: admin.id, 
      username: admin.username, 
      role: admin.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  )

  // Log activity
  await pool.query(
    'INSERT INTO activity_logs (admin_id, action) VALUES ($1, $2)',
    [admin.id, 'login']
  )

  res.json({
    success: true,
    message: 'Login successful',
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role
    }
  })
})

// Verify token
export const verifyToken = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    res.json({
      success: true,
      admin: decoded
    })
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    })
  }
})

export const getAdminProfile = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT au.id, au.username, au.email, au.role,
      (
        SELECT sm.photo_url
        FROM staff_members sm
        WHERE sm.admin_user_id = au.id
          AND NULLIF(BTRIM(sm.photo_url), '') IS NOT NULL
        ORDER BY (sm.status = 'active') DESC, sm.updated_at DESC NULLS LAST, sm.id DESC
        LIMIT 1
      ) AS photo_url
    FROM admin_users au
    WHERE au.id = $1 AND au.status = 'active'
  `, [req.admin.id])

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Admin profile not found.' })
  }

  res.json({ success: true, profile: result.rows[0] })
})

// Get dashboard stats
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    programmeCount,
    applicationCount,
    announcementCount,
    adminCount,
    recentApps,
    statusStats,
    applicationTrend,
    academicSummary,
    attendanceSummary,
    financeSummary
  ] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM programmes'),
    pool.query('SELECT COUNT(*) FROM applications'),
    pool.query('SELECT COUNT(*) FROM announcements'),
    pool.query('SELECT COUNT(*) FROM admin_users'),
    pool.query(`
      SELECT a.id, a.first_name, a.last_name, a.email, a.status, a.applied_at,
        (
          SELECT p.name
          FROM application_choices ac
          JOIN programme_intakes pi ON pi.id = ac.programme_intake_id
          JOIN programmes p ON p.id = pi.programme_id
          WHERE ac.application_id = a.id
          ORDER BY ac.preference_order
          LIMIT 1
        ) AS programme_name
      FROM applications a
      ORDER BY a.applied_at DESC
      LIMIT 5
    `),
    pool.query(`
      SELECT status, COUNT(*)::int AS count
      FROM applications
      GROUP BY status
    `),
    pool.query(`
      SELECT TO_CHAR(months.month_start, 'YYYY-MM') AS month,
        COUNT(a.id)::int AS count
      FROM generate_series(
        date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
        date_trunc('month', CURRENT_DATE),
        INTERVAL '1 month'
      ) AS months(month_start)
      LEFT JOIN applications a
        ON a.applied_at >= months.month_start
        AND a.applied_at < months.month_start + INTERVAL '1 month'
      GROUP BY months.month_start
      ORDER BY months.month_start
    `),
    pool.query(`
      WITH current_term AS (
        SELECT t.id, COALESCE(y.name || ' · ' || t.name, t.name) AS name
        FROM academic_terms t
        LEFT JOIN academic_years y ON y.id = t.academic_year_id
        WHERE CURRENT_DATE BETWEEN t.start_date AND t.end_date
        ORDER BY t.start_date DESC
        LIMIT 1
      )
      SELECT
        (SELECT name FROM current_term) AS current_term,
        (SELECT COUNT(*)::int FROM students) AS students_total,
        (SELECT COUNT(*)::int FROM students WHERE current_status = 'active') AS students_active,
        (SELECT COUNT(*)::int FROM class_schedules
          WHERE academic_term_id = (SELECT id FROM current_term)) AS classes,
        (SELECT COUNT(*)::int FROM lecturers WHERE is_active = true) AS lecturers_active,
        (SELECT COUNT(*)::int FROM staff_members WHERE status = 'active') AS staff_active,
        (SELECT COUNT(*)::int FROM staff_members
          WHERE status = 'active' AND role_type = 'administrative') AS staff_administrative,
        (SELECT COUNT(*)::int FROM staff_members
          WHERE status = 'active' AND role_type = 'support_staff') AS staff_support
    `),
    pool.query(`
      WITH current_term AS (
        SELECT id
        FROM academic_terms
        WHERE CURRENT_DATE BETWEEN start_date AND end_date
        ORDER BY start_date DESC
        LIMIT 1
      ),
      completed_sessions AS (
        SELECT cs.id,
          COUNT(DISTINCT ste.student_id)::int AS expected,
          COUNT(DISTINCT ar.student_id)
            FILTER (WHERE LOWER(ar.status) = 'present')::int AS present
        FROM class_sessions cs
        JOIN class_schedules sch ON sch.id = cs.schedule_id
        LEFT JOIN course_registrations cr
          ON cr.course_id = sch.course_id AND cr.status = 'registered'
        LEFT JOIN student_term_enrollments ste
          ON ste.id = cr.student_term_enrollment_id
          AND ste.academic_term_id = sch.academic_term_id
        LEFT JOIN attendance_records ar
          ON ar.session_id = cs.id AND ar.student_id = ste.student_id
        WHERE sch.academic_term_id = (SELECT id FROM current_term)
          AND (cs.status = 'ended' OR cs.end_time IS NOT NULL)
        GROUP BY cs.id
      )
      SELECT COUNT(*)::int AS completed_sessions,
        COALESCE(SUM(expected), 0)::int AS expected_attendance,
        COALESCE(SUM(present), 0)::int AS present_attendance,
        ROUND(100.0 * SUM(present)::numeric / NULLIF(SUM(expected), 0), 1) AS attendance_rate
      FROM completed_sessions
    `),
    pool.query(`
      WITH invoice_totals AS (
        SELECT i.currency,
          SUM(i.amount) FILTER (WHERE i.status <> 'void') AS billed,
          SUM(
            CASE
              WHEN i.status IN ('paid', 'void') THEN 0
              ELSE GREATEST(i.amount - COALESCE(applied.amount_applied, 0), 0)
            END
          ) AS outstanding
        FROM invoices i
        LEFT JOIN (
          SELECT ip.invoice_id, p.currency,
            SUM(ip.amount_applied) AS amount_applied
          FROM invoice_payments ip
          JOIN payments p ON p.id = ip.payment_id
          GROUP BY ip.invoice_id, p.currency
        ) applied
          ON applied.invoice_id = i.id AND applied.currency = i.currency
        GROUP BY i.currency
      ),
      payments_by_currency AS (
        SELECT currency, SUM(amount) AS received
        FROM payments
        GROUP BY currency
      )
      SELECT COALESCE(i.currency, p.currency) AS currency,
        COALESCE(i.billed, 0) AS billed,
        COALESCE(p.received, 0) AS received,
        COALESCE(i.outstanding, 0) AS outstanding
      FROM invoice_totals i
      FULL OUTER JOIN payments_by_currency p ON p.currency = i.currency
      ORDER BY currency
    `)
  ])

  const academic = academicSummary.rows[0]
  const attendance = attendanceSummary.rows[0]

  res.json({
    success: true,
    stats: {
      programmes: Number(programmeCount.rows[0].count),
      applications: Number(applicationCount.rows[0].count),
      announcements: Number(announcementCount.rows[0].count),
      admins: Number(adminCount.rows[0].count)
    },
    recentApplications: recentApps.rows,
    applicationStats: statusStats.rows,
    applicationTrend: applicationTrend.rows,
    operations: {
      currentTerm: academic.current_term,
      students: {
        total: Number(academic.students_total),
        active: Number(academic.students_active)
      },
      classes: Number(academic.classes),
      lecturers: { active: Number(academic.lecturers_active) },
      staff: {
        active: Number(academic.staff_active),
        administrative: Number(academic.staff_administrative),
        support: Number(academic.staff_support)
      },
      attendance: {
        completedSessions: Number(attendance.completed_sessions),
        expected: Number(attendance.expected_attendance),
        present: Number(attendance.present_attendance),
        rate: attendance.attendance_rate === null ? null : Number(attendance.attendance_rate)
      },
      finance: financeSummary.rows.map((row) => ({
        currency: row.currency,
        billed: Number(row.billed),
        received: Number(row.received),
        outstanding: Number(row.outstanding)
      }))
    }
  })
})
