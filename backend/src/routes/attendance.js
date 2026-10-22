import express from 'express'
import { 
  startSession, 
  streamQrCode, 
  submitAttendance,
  endSessionAndRunMesh,
  getActiveSessions,
  getHistoricalSessions,
  getSessionRecords,
  getTimetableOccurrenceTracking
} from '../controllers/attendanceController.js'
import { authMiddleware, adminOnly, lecturerOrAdmin, optionalStudentAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

// Active live sessions for students and lecturers
router.get('/active', optionalStudentAuth, getActiveSessions)

// Timetable occurrence & lesson tracking (Admin/Lecturer)
router.get('/timetable-tracking', lecturerOrAdmin, getTimetableOccurrenceTracking)

// Lecturer/Admin Routes
router.post('/start', lecturerOrAdmin, startSession)
router.get('/stream/:sessionId', streamQrCode) // SSE - no auth cookie support, secured via sessionId
router.post('/end/:sessionId', lecturerOrAdmin, endSessionAndRunMesh)
router.get('/sessions', lecturerOrAdmin, getHistoricalSessions)
router.get('/sessions/:sessionId', lecturerOrAdmin, getSessionRecords)

// Student Mobile App & Web Check-in Route
router.post('/submit', optionalStudentAuth, submitAttendance)

export default router
