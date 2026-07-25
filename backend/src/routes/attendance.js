import express from 'express'
import { 
  startSession, 
  streamQrCode, 
  submitAttendance,
  endSessionAndRunMesh,
  getHistoricalSessions,
  getSessionRecords
} from '../controllers/attendanceController.js'
import { authMiddleware, adminOnly, lecturerOrAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

// Lecturer/Admin Routes
router.post('/start', lecturerOrAdmin, startSession)
router.get('/stream/:sessionId', streamQrCode) // SSE - no auth cookie support, secured via sessionId
router.post('/end/:sessionId', lecturerOrAdmin, endSessionAndRunMesh)
router.get('/sessions', lecturerOrAdmin, getHistoricalSessions)
router.get('/sessions/:sessionId', lecturerOrAdmin, getSessionRecords)

// Student Mobile App Route (open for now - secured by signed payload in real production)
router.post('/submit', submitAttendance)

export default router
