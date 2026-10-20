import express from 'express'
import { getMyExams } from '../controllers/studentExamController.js'
import { getMyResults } from '../controllers/studentResultsController.js'
import { protectStudent } from '../middleware/authMiddleware.js'
import { 
  getMyProfile, 
  getMyInvoices, 
  generateExamPin, 
  getAttendanceStats, 
  getAttendanceDrilldown,
  getMyCoursesMaterials, 
  getMyTimetable,
  getMyEnrollments,
  getMyAnnouncements,
  acceptAdmissionOffer,
  getMyAdmissionLetter
} from '../controllers/studentProfileController.js'

const router = express.Router()

router.use(protectStudent)

router.get('/', getMyProfile)
router.get('/invoices', getMyInvoices)
router.get('/exams', getMyExams)
router.get('/results', getMyResults)
router.post('/exam-pin', generateExamPin)
router.get('/attendance', getAttendanceStats)
router.get('/attendance/:courseCode/drilldown', getAttendanceDrilldown)
router.get('/materials', getMyCoursesMaterials)
router.get('/timetable', getMyTimetable)
router.get('/enrollments', getMyEnrollments)
router.get('/announcements', getMyAnnouncements)
router.post('/accept-offer', acceptAdmissionOffer)
router.get('/admission-letter', getMyAdmissionLetter)

export default router
