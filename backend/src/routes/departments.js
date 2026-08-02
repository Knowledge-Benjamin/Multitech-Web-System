import express from 'express'
import * as departmentController from '../controllers/departmentController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

const authenticateAdmin = [authMiddleware, adminOnly]

router.get('/', departmentController.getDepartments)
router.get('/admin', authenticateAdmin, departmentController.getAdminDepartments)

router.post('/', authenticateAdmin, departmentController.createDepartment)
router.put('/:id', authenticateAdmin, departmentController.updateDepartment)
router.delete('/:id', authenticateAdmin, departmentController.deleteDepartment)

export default router
