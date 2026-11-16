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

// Get dashboard stats
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    programmeCount,
    applicationCount,
    announcementCount,
    adminCount,
    recentApps,
    statusStats,
    applicationTrend
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
    `)
  ])

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
    applicationTrend: applicationTrend.rows
  })
})
