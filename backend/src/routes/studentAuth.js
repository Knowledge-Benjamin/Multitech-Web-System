import express from 'express'
import { loginStudent, changePassword } from '../controllers/studentAuthController.js'
import { protectStudent } from '../middleware/authMiddleware.js'
import { loginLimiter } from '../middleware/rateLimiter.js'
import { validateStudentLogin } from '../middleware/validate.js'

const router = express.Router()

router.post('/login', loginLimiter, validateStudentLogin, loginStudent)
router.post('/change-password', protectStudent, changePassword)

export default router
