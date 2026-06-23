import express from 'express'
import * as functionalFeesController from '../controllers/functionalFeesController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

// Public routes (to display applicable functional fees to applicants)
router.get('/', functionalFeesController.getFunctionalFees)

// Admin routes (protected)
router.post('/', authMiddleware, adminOnly, functionalFeesController.createFunctionalFee)
router.put('/:id', authMiddleware, adminOnly, functionalFeesController.updateFunctionalFee)
router.delete('/:id', authMiddleware, adminOnly, functionalFeesController.deleteFunctionalFee)

export default router
