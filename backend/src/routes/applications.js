import express from 'express'
import multer from 'multer'
import * as applicationController from '../controllers/applicationController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file
})

// Multi-field upload: passport_photo (1 file), national_id (multiple), academic_docs (multiple)
const applicationUpload = upload.fields([
  { name: 'passport_photo', maxCount: 1 },
  { name: 'national_id', maxCount: 3 },
  { name: 'academic_docs', maxCount: 10 }
])

// Public routes
router.get('/check-status/:reference', applicationController.getApplicationById)
router.post('/', applicationUpload, applicationController.createApplication)

// Admin routes (protected)
router.get('/', authMiddleware, adminOnly, applicationController.getApplications)
router.get('/:id', authMiddleware, adminOnly, applicationController.getApplicationById)
router.put('/:id/payment', authMiddleware, adminOnly, applicationController.updatePaymentStatus)
router.post('/:id/remind-payment', authMiddleware, adminOnly, applicationController.sendPaymentReminder)
router.put('/:id/choices/:choice_id', authMiddleware, adminOnly, applicationController.evaluateApplicationChoice)
router.delete('/:id', authMiddleware, adminOnly, applicationController.deleteApplication)

export default router
