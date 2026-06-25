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
  const programmeCount = await pool.query('SELECT COUNT(*) FROM programmes')
  const applicationCount = await pool.query('SELECT COUNT(*) FROM applications')
  const announcementCount = await pool.query('SELECT COUNT(*) FROM announcements')
  const adminCount = await pool.query('SELECT COUNT(*) FROM admin_users')

  // Get recent applications
  const recentApps = await pool.query(
    'SELECT * FROM applications ORDER BY applied_at DESC LIMIT 5'
  )

  // Get application stats by status
  const statusStats = await pool.query(`
    SELECT status, COUNT(*) as count 
    FROM applications 
    GROUP BY status
  `)

  res.json({
    success: true,
    stats: {
      programmes: parseInt(programmeCount.rows[0].count),
      applications: parseInt(applicationCount.rows[0].count),
      announcements: parseInt(announcementCount.rows[0].count),
      admins: parseInt(adminCount.rows[0].count)
    },
    recentApplications: recentApps.rows,
    applicationStats: statusStats.rows
  })
})
