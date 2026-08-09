import jwt from 'jsonwebtoken'
import pool from '../config/database.js'

const JWT_ALGORITHM = 'HS256'

/**
 * Verifies the Bearer JWT and checks the admin user is still active in the DB.
 * This prevents deactivated accounts or role-changed users from retaining access.
 */
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    })
  }

  try {
    // Explicitly enforce HS256 to prevent algorithm confusion attacks
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM]
    })

    // Re-verify against DB: confirm user exists and is still active
    const result = await pool.query(
      'SELECT id, username, email, role, status FROM admin_users WHERE id = $1',
      [decoded.id]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }

    const dbUser = result.rows[0]

    if (dbUser.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account is inactive' })
    }

    // Set req.admin from DB (not the token) so role changes take effect immediately
    req.admin = {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role
    }

    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    })
  }
}

export const adminOnly = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    })
  }

  if (req.admin.role !== 'admin' && req.admin.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    })
  }

  next()
}

export const superAdminOnly = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    })
  }

  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required'
    })
  }

  next()
}

/**
 * Protects student routes. Verifies JWT and re-confirms student record exists.
 */
export const protectStudent = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM]
    })
    if (decoded.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Student access required' })
    }
    req.student = decoded
    next()
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

export const lecturerOnly = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM]
    })
    if (decoded.role !== 'lecturer') {
      return res.status(403).json({ success: false, message: 'Lecturer access required' })
    }
    req.lecturer = decoded
    next()
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

// Allows both admins (superadmin/admin) and lecturers
export const lecturerOrAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM]
    })
    if (decoded.role === 'lecturer') {
      req.lecturer = decoded
    } else if (decoded.role === 'admin' || decoded.role === 'superadmin') {
      req.admin = decoded
    } else {
      return res.status(403).json({ success: false, message: 'Lecturer or Admin access required' })
    }
    next()
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}
