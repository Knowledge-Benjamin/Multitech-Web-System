import { body, param, validationResult } from 'express-validator'

/**
 * Middleware to collect and return express-validator errors.
 * Place after your validation chain arrays.
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    })
  }
  next()
}

// ─── Admin Login ─────────────────────────────────────────────────────────────
export const validateAdminLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ max: 100 }).withMessage('Username too long')
    .matches(/^[a-zA-Z0-9_.\-@]+$/).withMessage('Username contains invalid characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ max: 200 }).withMessage('Password too long'),
  handleValidationErrors
]

// ─── Student Login ────────────────────────────────────────────────────────────
export const validateStudentLogin = [
  body('student_number')
    .trim()
    .notEmpty().withMessage('Student number is required')
    .isLength({ max: 50 }).withMessage('Student number too long'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ max: 200 }).withMessage('Password too long'),
  handleValidationErrors
]

// ─── Create Admin User ────────────────────────────────────────────────────────
const VALID_ADMIN_ROLES = ['admin', 'teacher']

export const validateCreateAdmin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3–50 characters')
    .matches(/^[a-zA-Z0-9_.\-]+$/).withMessage('Username may only contain letters, numbers, underscores, dots, and hyphens'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email too long'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .isLength({ max: 128 }).withMessage('Password too long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('role')
    .optional()
    .isIn(VALID_ADMIN_ROLES).withMessage(`Role must be one of: ${VALID_ADMIN_ROLES.join(', ')}`),
  handleValidationErrors
]

// ─── Update Admin User ────────────────────────────────────────────────────────
const VALID_STATUSES = ['active', 'inactive']

export const validateUpdateAdmin = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid user ID'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email too long'),
  body('role')
    .optional()
    .isIn(VALID_ADMIN_ROLES).withMessage(`Role must be one of: ${VALID_ADMIN_ROLES.join(', ')}`),
  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
  handleValidationErrors
]

// ─── Generic ID param ─────────────────────────────────────────────────────────
export const validateIdParam = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid ID'),
  handleValidationErrors
]
