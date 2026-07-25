import express from 'express'
import {
  requireWebhookSignature,
  handleExamPublished,
  handleVerifyPin,
  handleTeacherProvisioned,
  handleGradeSubmitted,
} from '../controllers/examPortalWebhookController.js'

const router = express.Router()

// All webhook routes verified by HMAC signature
router.use(requireWebhookSignature)

// Exam Portal → ERP: a teacher generated a SEB file and published the exam
router.post('/exam-published', handleExamPublished)

// Exam Portal → ERP: verify a student's one-time PIN (called before SEB join)
router.post('/verify-pin', handleVerifyPin)

// Exam Portal → ERP: teacher account provisioned (future use / stub)
router.post('/teacher-provisioned', handleTeacherProvisioned)

// Exam Portal → ERP: teacher submitted marks for a student submission
router.post('/grade-submitted', handleGradeSubmitted)

export default router
