// Utility functions for database operations

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

export const validateRequired = (fields, obj) => {
  const missing = fields.filter(field => !obj[field])
  return missing.length === 0 ? null : `Missing required fields: ${missing.join(', ')}`
}

export const sanitizeObject = (obj, allowedFields) => {
  const sanitized = {}
  allowedFields.forEach(field => {
    if (field in obj) {
      sanitized[field] = obj[field]
    }
  })
  return sanitized
}
