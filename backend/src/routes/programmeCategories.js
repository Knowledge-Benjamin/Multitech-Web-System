import express from 'express'
import multer from 'multer'
import * as categoryController from '../controllers/programmeCategoryController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

// Multer config (memory storage for direct Google Drive upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only images are allowed'))
    }
  }
})

// Public routes
router.get('/', categoryController.getCategories)

// Admin routes
router.put('/:id/image', authMiddleware, adminOnly, upload.single('image'), categoryController.uploadCategoryImage)

export default router
