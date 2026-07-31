import express from 'express'
import {
  getIntakes,
  getActiveIntakes,
  createIntake,
  updateIntake,
  getProgrammeIntakes,
  linkProgrammeToIntake
} from '../controllers/intakeController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/active', getActiveIntakes)
router.get('/', authMiddleware, adminOnly, getIntakes)
router.post('/', authMiddleware, adminOnly, createIntake)
router.put('/:id', authMiddleware, adminOnly, updateIntake)
router.get('/:id/programmes', authMiddleware, adminOnly, getProgrammeIntakes)
router.post('/link-programme', authMiddleware, adminOnly, linkProgrammeToIntake)

export default router
