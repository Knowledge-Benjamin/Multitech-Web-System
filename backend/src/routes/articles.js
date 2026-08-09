import express from 'express'
import * as articleController from '../controllers/articleController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'
import multer from 'multer'

const router = express.Router()

// Multer memory storage config — 5MB limit, images only
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed.'))
    }
  }
})

// Public routes
router.get('/', articleController.getArticles)
router.get('/carousel', articleController.getHeroCarouselArticles)

// Admin routes
router.get('/admin', authMiddleware, adminOnly, articleController.getAdminArticles)
router.post('/', authMiddleware, adminOnly, upload.single('featured_image'), articleController.createArticle)
router.put('/:id', authMiddleware, adminOnly, upload.single('featured_image'), articleController.updateArticle)
router.delete('/:id', authMiddleware, adminOnly, articleController.deleteArticle)

// Public routes with parameters
router.get('/:id', articleController.getArticleById)

export default router
