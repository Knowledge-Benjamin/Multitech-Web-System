import express from 'express'
import * as announcementController from '../controllers/announcementController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

// Public routes
router.get('/', announcementController.getAnnouncements)
router.get('/:id', announcementController.getAnnouncementById)

// Admin routes (protected)
router.post('/', authMiddleware, adminOnly, announcementController.createAnnouncement)
router.put('/:id', authMiddleware, adminOnly, announcementController.updateAnnouncement)
router.delete('/:id', authMiddleware, adminOnly, announcementController.deleteAnnouncement)

export default router
