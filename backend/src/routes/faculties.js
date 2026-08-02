import express from 'express'
import multer from 'multer'
import * as facultyController from '../controllers/facultyController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
})

const authenticateAdmin = [authMiddleware, adminOnly]

router.get('/', facultyController.getFaculties)
router.get('/admin', authenticateAdmin, facultyController.getAdminFaculties)

router.post('/', authenticateAdmin, upload.single('image'), facultyController.createFaculty)
router.put('/:id', authenticateAdmin, upload.single('image'), facultyController.updateFaculty)
router.delete('/:id', authenticateAdmin, facultyController.deleteFaculty)

export default router
