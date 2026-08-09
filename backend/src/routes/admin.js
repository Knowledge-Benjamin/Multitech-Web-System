import express from 'express'
import {
  getAdminUsers,
  getAdminUser,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getActivityLogs
} from '../controllers/adminController.js'
import * as driveController from '../controllers/driveController.js'
import { authMiddleware, superAdminOnly } from '../middleware/authMiddleware.js'
import { validateCreateAdmin, validateUpdateAdmin, validateIdParam } from '../middleware/validate.js'

const router = express.Router()

// Google Drive OAuth Callback (Must be public to catch redirect)
// State param is validated inside handleCallback to prevent CSRF
router.get('/gdrive/callback', driveController.handleCallback)

// All admin management routes require superadmin
router.use(authMiddleware)
router.use(superAdminOnly)

// Google Drive OAuth routes (Admin only)
router.get('/gdrive/auth-url', driveController.getAuthUrl)
router.get('/gdrive/status', driveController.getStatus)
router.delete('/gdrive/disconnect', driveController.disconnectDrive)

// Admin users management
router.get('/users', getAdminUsers)
router.get('/users/:id', validateIdParam, getAdminUser)
router.post('/users', validateCreateAdmin, createAdminUser)
router.put('/users/:id', validateUpdateAdmin, updateAdminUser)
router.delete('/users/:id', validateIdParam, deleteAdminUser)

// Activity logs
router.get('/logs', getActivityLogs)

export default router

