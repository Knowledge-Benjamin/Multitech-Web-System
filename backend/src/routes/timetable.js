import express from 'express'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'
import {
  getRooms, createRoom, deleteRoom,
  getSchedules, createSchedule, deleteSchedule,
  getCoursesList, getLecturersList, getTermsList
} from '../controllers/timetableController.js'

const router = express.Router()

// Rooms
router.get('/rooms', authMiddleware, getRooms)
router.post('/rooms', authMiddleware, adminOnly, createRoom)
router.delete('/rooms/:id', authMiddleware, adminOnly, deleteRoom)

// Class Schedules
router.get('/schedules', authMiddleware, getSchedules)
router.post('/schedules', authMiddleware, createSchedule)
router.delete('/schedules/:id', authMiddleware, adminOnly, deleteSchedule)

// Supporting dropdown data
router.get('/courses', authMiddleware, getCoursesList)
router.get('/lecturers', authMiddleware, getLecturersList)
router.get('/terms', authMiddleware, getTermsList)

export default router
