import express from 'express'
import { loginStudent, changePassword } from '../controllers/studentAuthController.js'
import { protectStudent } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/login', loginStudent)
router.post('/change-password', protectStudent, changePassword)

export default router
