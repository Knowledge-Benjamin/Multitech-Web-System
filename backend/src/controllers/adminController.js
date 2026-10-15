import pool from '../config/database.js'
import bcrypt from 'bcryptjs'
import { asyncHandler } from '../utils/helpers.js'

// Get all admin users
export const getAdminUsers = asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT id, username, email, role, status, created_at FROM admin_users ORDER BY created_at DESC'
  )

  res.json({
    success: true,
    admins: result.rows
  })
})

// Get single admin user
export const getAdminUser = asyncHandler(async (req, res) => {
  const { id } = req.params

  const result = await pool.query(
    'SELECT id, username, email, role, status, created_at FROM admin_users WHERE id = $1',
    [id]
  )

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Admin user not found'
    })
  }

  res.json({
    success: true,
    admin: result.rows[0]
  })
})

// Allowed roles — enforced at controller level as defence-in-depth
const VALID_ADMIN_ROLES = ['admin', 'teacher']

// Create admin user
export const createAdminUser = asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body

  // Whitelist role — prevent role escalation via body injection
  const assignedRole = VALID_ADMIN_ROLES.includes(role) ? role : 'admin'

  const hashedPassword = await bcrypt.hash(password, 12)

  try {
    const result = await pool.query(
      'INSERT INTO admin_users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, status',
      [username, email, hashedPassword, assignedRole]
    )

    // Admin Sync: Provision teacher in Exam Portal
    // NOTE: We send a signed one-time-token — NOT the plaintext password
    if (assignedRole === 'teacher' || assignedRole === 'admin') {
      import('crypto').then((crypto) => {
        const secret = process.env.EXAM_PORTAL_WEBHOOK_SECRET
        if (secret) {
          // One-time provision token — Exam Portal must enforce its own password reset flow
          const provisionToken = crypto.randomBytes(32).toString('hex')
          const payload = JSON.stringify({
            name: username,
            email: email,
            provision_token: provisionToken,
            role: assignedRole,
          })
          const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
          const examPortalUrl = (process.env.EXAM_PORTAL_BACKEND_URL || process.env.EXAM_PORTAL_URL || 'http://localhost:3001').replace(/\/+$/, '')
          fetch(`${examPortalUrl}/api/webhooks/provision-teacher`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-erp-signature': signature,
            },
            body: payload,
          }).catch(err => console.warn('[adminSync] Failed to provision teacher in Exam Portal:', err.message))
        }
      })
    }

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      admin: result.rows[0]
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      })
    }
    throw error
  }
})

// Allowed statuses
const VALID_STATUSES = ['active', 'inactive']

// Update admin user
export const updateAdminUser = asyncHandler(async (req, res) => {
  const { id } = req.params
  let { email, role, status } = req.body

  // Whitelist role and status values — defence-in-depth
  if (role && !VALID_ADMIN_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role value' })
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' })
  }

  const result = await pool.query(
    'UPDATE admin_users SET email = $1, role = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, username, email, role, status',
    [email, role, status, id]
  )

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Admin user not found'
    })
  }

  res.json({
    success: true,
    message: 'Admin user updated successfully',
    admin: result.rows[0]
  })
})

// Delete admin user
export const deleteAdminUser = asyncHandler(async (req, res) => {
  const { id } = req.params

  // Prevent deleting the last superadmin
  const superadminCount = await pool.query(
    'SELECT COUNT(*) FROM admin_users WHERE role = $1',
    ['superadmin']
  )

  if (parseInt(superadminCount.rows[0].count) === 1) {
    const checkUser = await pool.query(
      'SELECT role FROM admin_users WHERE id = $1',
      [id]
    )

    if (checkUser.rows[0]?.role === 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last superadmin'
      })
    }
  }

  const result = await pool.query(
    'DELETE FROM admin_users WHERE id = $1 RETURNING id',
    [id]
  )

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Admin user not found'
    })
  }

  res.json({
    success: true,
    message: 'Admin user deleted successfully'
  })
})

// Get activity logs
export const getActivityLogs = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT l.*, a.username 
    FROM activity_logs l
    LEFT JOIN admin_users a ON l.admin_id = a.id
    ORDER BY l.created_at DESC
    LIMIT 100
  `)

  res.json({
    success: true,
    logs: result.rows
  })
})
