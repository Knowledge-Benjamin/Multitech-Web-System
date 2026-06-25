import express from 'express'
import * as homeReasonsController from '../controllers/homeReasonsController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

// Public
router.get('/', homeReasonsController.getPublicHomeReasons)

// Admin
router.get('/admin', authMiddleware, adminOnly, homeReasonsController.getAdminHomeReasons)
router.post('/admin', authMiddleware, adminOnly, homeReasonsController.createHomeReason)
router.put('/admin/:id', authMiddleware, adminOnly, homeReasonsController.updateHomeReason)
router.delete('/admin/:id', authMiddleware, adminOnly, homeReasonsController.deleteHomeReason)

export default router
