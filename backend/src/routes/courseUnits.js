import express from 'express'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'
import {
  getCourseUnits,
  getCourseUnit,
  createCourseUnit,
  updateCourseUnit,
  deleteCourseUnit
} from '../controllers/courseUnitsController.js'

const router = express.Router()

router.get('/', authMiddleware, getCourseUnits)
router.get('/:id', authMiddleware, getCourseUnit)
router.post('/', authMiddleware, adminOnly, createCourseUnit)
router.put('/:id', authMiddleware, adminOnly, updateCourseUnit)
router.delete('/:id', authMiddleware, adminOnly, deleteCourseUnit)

export default router
