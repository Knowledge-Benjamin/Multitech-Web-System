import express from 'express'
import {
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  getAcademicTerms,
  createAcademicTerm,
  updateAcademicTerm,
  deleteAcademicTerm
} from '../controllers/calendarController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

// All calendar endpoints require Admin privileges
router.use(authMiddleware)
router.use(adminOnly)

// Academic Years
router.get('/years', getAcademicYears)
router.post('/years', createAcademicYear)
router.put('/years/:id', updateAcademicYear)
router.delete('/years/:id', deleteAcademicYear)

// Academic Terms
router.get('/terms', getAcademicTerms)
router.post('/terms', createAcademicTerm)
router.put('/terms/:id', updateAcademicTerm)
router.delete('/terms/:id', deleteAcademicTerm)

export default router
