import express from 'express'
import multer from 'multer'
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

router.post('/contact', sendContactMessage)
router.get('/settings', authMiddleware, adminOnly, getEmailSettings)
router.put('/settings', authMiddleware, adminOnly, updateEmailSettings)
router.get('/messages', authMiddleware, adminOnly, getEmailMessages)
router.get('/messages/:id', authMiddleware, adminOnly, getEmailMessage)
router.patch('/messages/:id/read', authMiddleware, adminOnly, markEmailMessageRead)
router.post('/messages/:id/reply', authMiddleware, adminOnly, replyToEmailMessage)
router.post('/communications/send', authMiddleware, adminOnly, upload.array('attachments', 10), sendCustomAdminEmail)
router.get('/communications/defaults', authMiddleware, adminOnly, getEmailDefaultFrom)

export default router
