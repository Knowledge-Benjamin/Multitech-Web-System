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

// I noticed the subagent used `authenticateAdmin` but the prompt mentioned `authMiddleware, adminOnly`.
// I will use `authMiddleware, adminOnly` as that's the standard in this project.
const authenticateAdmin = [authMiddleware, adminOnly]

router.get('/', campusController.getCampuses)
router.get('/admin', authenticateAdmin, campusController.getAdminCampuses)
router.get('/:slug', campusController.getCampusBySlug)

router.post('/', authenticateAdmin, upload.single('featured_image'), campusController.createCampus)
router.put('/:id', authenticateAdmin, upload.single('featured_image'), campusController.updateCampus)
router.delete('/:id', authenticateAdmin, campusController.deleteCampus)
router.post('/:id/programmes', authenticateAdmin, campusController.setCampusProgrammes)

export default router
