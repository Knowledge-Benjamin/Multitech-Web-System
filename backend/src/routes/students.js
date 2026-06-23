import express from 'express'
import {
  getStudents,
  getStudentById,
  updateStudentEnrollmentStatus
} from '../controllers/studentController.js'
import { adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

// All endpoints require Admin privileges
router.use(adminOnly)

router.get('/', getStudents)
router.get('/:id', getStudentById)
router.put('/enrollments/:enrollmentId/status', updateStudentEnrollmentStatus)

export default router
