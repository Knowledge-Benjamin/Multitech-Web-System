import express from 'express'
import multer from 'multer'
import * as programmeController from '../controllers/programmeController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

// Multer config for memory storage (for Google Drive upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
})

// Public routes
router.get('/', programmeController.getProgrammes)
router.get('/:id', programmeController.getProgrammeById)

// Admin routes (protected)
router.post('/', authMiddleware, adminOnly, upload.single('image'), programmeController.createProgramme)
router.put('/:id', authMiddleware, adminOnly, upload.single('image'), programmeController.updateProgramme)
router.put('/:id/image', authMiddleware, adminOnly, upload.single('image'), programmeController.updateProgrammeImage)
router.delete('/:id', authMiddleware, adminOnly, programmeController.deleteProgramme)

export default router
