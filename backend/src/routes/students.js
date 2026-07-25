import express from 'express'
import {
  getStudents,
  getStudentById,
  updateStudentEnrollmentStatus,
  enrollStudentInTerm,
  getCourseRegistrations,
  registerCourses,
  removeCourseRegistration
} from '../controllers/studentController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

// All endpoints require Admin privileges
router.use(authMiddleware)
router.use(adminOnly)

router.get('/', getStudents)
router.get('/:id', getStudentById)
router.post('/:id/enroll', enrollStudentInTerm)
router.put('/enrollments/:enrollmentId/status', updateStudentEnrollmentStatus)
router.get('/enrollments/:enrollmentId/courses', getCourseRegistrations)
router.post('/enrollments/:enrollmentId/courses', registerCourses)
router.delete('/course-registrations/:registrationId', removeCourseRegistration)

export default router
