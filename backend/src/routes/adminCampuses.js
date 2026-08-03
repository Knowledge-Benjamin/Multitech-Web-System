import express from 'express'
import multer from 'multer'
import * as campusController from '../controllers/campusController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
})

const authenticateAdmin = [authMiddleware, adminOnly]

router.get('/', authenticateAdmin, campusController.getAdminCampuses)
router.post('/', authenticateAdmin, upload.single('featured_image'), campusController.createCampus)
router.put('/:id', authenticateAdmin, upload.single('featured_image'), campusController.updateCampus)
router.delete('/:id', authenticateAdmin, campusController.deleteCampus)
router.post('/:id/programmes', authenticateAdmin, campusController.setCampusProgrammes)

export default router
