import express from 'express'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'
import {
  getRooms, createRoom, updateRoom, deleteRoom,
  getSchedules, createSchedule, updateSchedule, deleteSchedule,
  autoGenerateTimetable, clearTermSchedules,
  getCoursesList, getLecturersList, getTermsList
} from '../controllers/timetableController.js'

const router = express.Router()

// Rooms
router.get('/rooms', authMiddleware, getRooms)
router.post('/rooms', authMiddleware, adminOnly, createRoom)
router.put('/rooms/:id', authMiddleware, adminOnly, updateRoom)
router.delete('/rooms/:id', authMiddleware, adminOnly, deleteRoom)

// Class Schedules
router.get('/schedules', authMiddleware, getSchedules)
router.post('/schedules', authMiddleware, createSchedule)
router.put('/schedules/:id', authMiddleware, adminOnly, updateSchedule)
router.delete('/schedules/:id', authMiddleware, adminOnly, deleteSchedule)

// Auto-generation & Term Operations
router.post('/auto-generate', authMiddleware, adminOnly, autoGenerateTimetable)
router.delete('/schedules/term/:termId', authMiddleware, adminOnly, clearTermSchedules)

// Supporting dropdown data
router.get('/courses', authMiddleware, getCoursesList)
router.get('/lecturers', authMiddleware, getLecturersList)
router.get('/terms', authMiddleware, getTermsList)

export default router
