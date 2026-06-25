import express from 'express'
import * as aboutController from '../controllers/aboutController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'
import multer from 'multer'

const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({ storage })

// Public
router.get('/', aboutController.getAboutHero)
router.get('/sections', aboutController.getAboutSections)

// Admin
router.get('/admin', authMiddleware, adminOnly, aboutController.getAdminAbout)
router.get('/admin/sections', authMiddleware, adminOnly, aboutController.getAdminAboutSections)
router.post('/', authMiddleware, adminOnly, upload.single('featured_image'), aboutController.createOrUpdateAbout)
router.post('/admin/sections', authMiddleware, adminOnly, aboutController.createAboutSection)
router.post('/admin/sections/upload-avatar', authMiddleware, adminOnly, upload.single('avatar'), aboutController.uploadSectionAvatar)
router.put('/admin/sections/:id', authMiddleware, adminOnly, aboutController.updateAboutSection)
router.put('/', authMiddleware, adminOnly, upload.single('featured_image'), aboutController.createOrUpdateAbout)
router.delete('/admin/sections/:id', authMiddleware, adminOnly, aboutController.deleteAboutSection)
router.delete('/', authMiddleware, adminOnly, aboutController.deleteAbout)

export default router
