import express from 'express'
import rateLimit from 'express-rate-limit'
import { loginStudent, changePassword } from '../controllers/studentAuthController.js'
import { protectStudent } from '../middleware/authMiddleware.js'

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per window
  message: { success: false, message: 'Too many login attempts, please try again later.' }
})

router.post('/login', loginLimiter, loginStudent)
router.post('/change-password', protectStudent, changePassword)

export default router
