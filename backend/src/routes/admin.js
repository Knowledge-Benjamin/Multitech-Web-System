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

const router = express.Router()

// Google Drive OAuth Callback (Must be public to catch redirect)
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
router.get('/users/:id', getAdminUser)
router.post('/users', createAdminUser)
router.put('/users/:id', updateAdminUser)
router.delete('/users/:id', deleteAdminUser)

// Activity logs
router.get('/logs', getActivityLogs)

export default router
