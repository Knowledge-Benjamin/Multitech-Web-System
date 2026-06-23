import express from 'express'
import { getMyProfile, getMyInvoices } from '../controllers/studentProfileController.js'
import { protectStudent } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(protectStudent)

router.get('/', getMyProfile)
router.get('/invoices', getMyInvoices)

export default router
