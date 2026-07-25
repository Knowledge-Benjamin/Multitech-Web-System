import express from 'express'
import multer from 'multer'
import { login, getDashboardStats } from '../controllers/lecturerAuthController.js'
import {
  getAssignedCourses,
  getCourseDetails,
  uploadCourseMaterial,
  deleteCourseMaterial,
  getCourseStudents,
  saveCourseGrades,
  getCourseAnnouncements,
  createCourseAnnouncement,
  deleteCourseAnnouncement,
  generateExamSSOToken
} from '../controllers/lecturerController.js'
import { lecturerOnly } from '../middleware/authMiddleware.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }) // 50MB

// ── Auth ─────────────────────────────────────────────────────────────────────
router.post('/login', login)

// ── Protected lecturer routes ─────────────────────────────────────────────────
router.use(lecturerOnly)

router.get('/dashboard/stats', getDashboardStats)
router.get('/courses', getAssignedCourses)
router.get('/courses/:courseId', getCourseDetails)

// Course materials
router.post('/courses/:courseId/materials', upload.single('file'), uploadCourseMaterial)
router.delete('/materials/:materialId', deleteCourseMaterial)

// Grades
router.get('/courses/:courseId/students', getCourseStudents)
router.post('/courses/:courseId/grades', saveCourseGrades)

// SSO integration for exams
router.get('/courses/:courseId/exam-sso', generateExamSSOToken)

// Announcements
router.get('/courses/:courseId/announcements', getCourseAnnouncements)
router.post('/courses/:courseId/announcements', createCourseAnnouncement)
router.delete('/announcements/:announcementId', deleteCourseAnnouncement)

export default router
