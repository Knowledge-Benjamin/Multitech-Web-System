import express from 'express'
import { loginAdmin, verifyToken, getDashboardStats } from '../controllers/authController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'
import rateLimit from 'express-rate-limit'

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per 15 minutes
  message: { success: false, message: 'Too many login attempts, please try again later.' }
})

// Public routes
router.post('/login', loginLimiter, loginAdmin)
router.get('/verify', verifyToken)

// Protected routes
router.get('/dashboard/stats', authMiddleware, adminOnly, getDashboardStats)

export default router
