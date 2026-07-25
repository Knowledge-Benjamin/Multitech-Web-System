import jwt from 'jsonwebtoken'
import pool from '../config/database.js'

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.admin = decoded
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

export const protectStudent = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Student access required' })
    }
    req.student = decoded
    next()
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

export const lecturerOnly = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
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
export const lecturerOrAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
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
