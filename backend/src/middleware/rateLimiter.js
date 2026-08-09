import rateLimit from 'express-rate-limit'

/**
 * Strict rate limiter for admin & student login endpoints.
 * 5 attempts per IP per 15 minutes.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  // Skip successful requests — only count failures toward the limit
  skipSuccessfulRequests: true
})

/**
 * General API rate limiter — moderate protection for all routes.
 * 200 requests per IP per 15 minutes.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.'
  }
})

/**
 * Strict rate limiter for public form submissions (e.g. applications, contact).
 * 10 requests per IP per hour.
 */
export const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many submissions. Please try again later.'
  }
})
