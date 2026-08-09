import express from 'express'
import { loginAdmin, verifyToken, getDashboardStats } from '../controllers/authController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'
import { loginLimiter } from '../middleware/rateLimiter.js'
import { validateAdminLogin } from '../middleware/validate.js'

const router = express.Router()

// Public routes
router.post('/login', loginLimiter, validateAdminLogin, loginAdmin)
router.get('/verify', verifyToken)

// Protected routes
router.get('/dashboard/stats', authMiddleware, adminOnly, getDashboardStats)

export default router
