import express from 'express'
import * as programmeFeesController from '../controllers/programmeFeesController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

// Admin: get ALL programme fees across all programmes
router.get('/', authMiddleware, adminOnly, programmeFeesController.getAllProgrammeFees)

// Public: get fees for a specific programme
router.get('/programme/:programme_id', programmeFeesController.getProgrammeFees)

// Admin CRUD
router.post('/', authMiddleware, adminOnly, programmeFeesController.createProgrammeFee)
router.put('/:id', authMiddleware, adminOnly, programmeFeesController.updateProgrammeFee)
router.delete('/:id', authMiddleware, adminOnly, programmeFeesController.deleteProgrammeFee)

export default router
