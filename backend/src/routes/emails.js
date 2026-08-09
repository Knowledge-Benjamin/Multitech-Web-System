import express from 'express'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import {
  sendContactMessage,
  getEmailSettings,
  updateEmailSettings,
  getEmailMessages,
  getEmailMessage,
  markEmailMessageRead,
  replyToEmailMessage
} from '../controllers/emailController.js'
import {
  sendCustomAdminEmail,
  getEmailDefaultFrom
} from '../controllers/customEmailController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

// Strict rate limit on the public contact form to prevent spam / email-bombing
const contactFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 submissions per IP per window
  message: { success: false, message: 'Too many messages sent. Please wait before trying again.' }
})

router.post('/contact', contactFormLimiter, sendContactMessage)
router.get('/settings', authMiddleware, adminOnly, getEmailSettings)
router.put('/settings', authMiddleware, adminOnly, updateEmailSettings)
router.get('/messages', authMiddleware, adminOnly, getEmailMessages)
router.get('/messages/:id', authMiddleware, adminOnly, getEmailMessage)
router.patch('/messages/:id/read', authMiddleware, adminOnly, markEmailMessageRead)
router.post('/messages/:id/reply', authMiddleware, adminOnly, replyToEmailMessage)
router.post('/communications/send', authMiddleware, adminOnly, upload.array('attachments', 10), sendCustomAdminEmail)
router.get('/communications/defaults', authMiddleware, adminOnly, getEmailDefaultFrom)

export default router
