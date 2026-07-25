import express from 'express'
import {
  getLecturers,
  createLecturer,
  updateLecturer,
  getLecturerAssignments,
  assignCourse,
  removeAssignment
} from '../controllers/adminLecturersController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authMiddleware)
router.use(adminOnly)

// Lecturer management
router.get('/', getLecturers)
router.post('/', createLecturer)
router.put('/:id', updateLecturer)

// Course assignment management
router.get('/:id/assignments', getLecturerAssignments)
router.post('/assignments', assignCourse)
router.delete('/assignments/:assignmentId', removeAssignment)

export default router
