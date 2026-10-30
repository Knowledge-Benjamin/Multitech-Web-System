import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import WhatsAppCta from './components/WhatsAppCta'
import ProtectedRoute from './components/ProtectedRoute'
import ProtectedStudentRoute from './components/ProtectedStudentRoute'
import ProtectedLecturerRoute from './components/ProtectedLecturerRoute'
import './App.css'

const Home = lazy(() => import('./pages/Home'))
const Programmes = lazy(() => import('./pages/Programmes'))
const ProgrammeDetails = lazy(() => import('./pages/ProgrammeDetails'))
const Apply = lazy(() => import('./pages/Apply'))
const NotFound = lazy(() => import('./pages/NotFound'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminIntakes = lazy(() => import('./pages/AdminIntakes'))
const AdminProgrammes = lazy(() => import('./pages/AdminProgrammes'))
const AdminFees = lazy(() => import('./pages/AdminFees'))
const AdminApplications = lazy(() => import('./pages/AdminApplications'))
const AdminCalendar = lazy(() => import('./pages/AdminCalendar'))
const AdminStudents = lazy(() => import('./pages/AdminStudents'))
const AdminAnnouncements = lazy(() => import('./pages/AdminAnnouncements'))
const AdminArticles = lazy(() => import('./pages/AdminArticles'))
const AdminAbout = lazy(() => import('./pages/AdminAbout'))
const AdminAboutSections = lazy(() => import('./pages/AdminAboutSections'))
const AdminHomeReasons = lazy(() => import('./pages/AdminHomeReasons'))
const AdminMessages = lazy(() => import('./pages/AdminMessages'))
const AdminCommunications = lazy(() => import('./pages/AdminCommunications'))
const AdminSettings = lazy(() => import('./pages/AdminSettings'))
const AdminCampuses = lazy(() => import('./pages/AdminCampuses'))
const AdminFaculties = lazy(() => import('./pages/AdminFaculties'))
const AdminDepartments = lazy(() => import('./pages/AdminDepartments'))
const Articles = lazy(() => import('./pages/Articles'))
const ArticleView = lazy(() => import('./pages/ArticleView'))
const About = lazy(() => import('./pages/About'))
const ContactUs = lazy(() => import('./pages/ContactUs'))
const Campuses = lazy(() => import('./pages/Campuses'))
const CampusDetails = lazy(() => import('./pages/CampusDetails'))
const PortalLogin = lazy(() => import('./pages/PortalLogin'))
const StudentLogin = lazy(() => import('./pages/StudentLogin'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const StudentFinances = lazy(() => import('./pages/StudentFinances'))
const StudentCourses = lazy(() => import('./pages/StudentCourses'))
const StudentProfile = lazy(() => import('./pages/StudentProfile'))
const StudentExams = lazy(() => import('./pages/StudentExams'))
const StudentResults = lazy(() => import('./pages/StudentResults'))
const StudentAttendance = lazy(() => import('./pages/StudentAttendance'))
const StudentTimetable = lazy(() => import('./pages/StudentTimetable'))
const StudentAnnouncements = lazy(() => import('./pages/StudentAnnouncements'))
const LecturerAttendance = lazy(() => import('./pages/LecturerAttendance'))
const LecturerLogin = lazy(() => import('./pages/LecturerLogin'))
const LecturerDashboard = lazy(() => import('./pages/LecturerDashboard'))
const LecturerCourseDetails = lazy(() => import('./pages/LecturerCourseDetails'))
const LecturerTimetable = lazy(() => import('./pages/LecturerTimetable'))
const AdminAttendanceReports = lazy(() => import('./pages/AdminAttendanceReports'))
const AdminTimetable = lazy(() => import('./pages/AdminTimetable'))
const AdminLecturers = lazy(() => import('./pages/AdminLecturers'))
const AdminIdCards = lazy(() => import('./pages/admin/AdminIdCards'))
const VerifyIdCard = lazy(() => import('./pages/VerifyIdCard'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>}>
        <Routes>
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/intakes"
          element={
            <ProtectedRoute>
              <AdminIntakes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/programmes"
          element={
            <ProtectedRoute>
              <AdminProgrammes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/fees"
          element={
            <ProtectedRoute>
              <AdminFees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/applications"
          element={
            <ProtectedRoute>
              <AdminApplications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute>
              <AdminStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/calendar"
          element={
            <ProtectedRoute>
              <AdminCalendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <ProtectedRoute>
              <AdminAnnouncements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/articles"
          element={
            <ProtectedRoute>
              <AdminArticles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/about"
          element={
            <ProtectedRoute>
              <AdminAbout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/about-sections"
          element={
            <ProtectedRoute>
              <AdminAboutSections />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/home-reasons"
          element={
            <ProtectedRoute>
              <AdminHomeReasons />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <AdminSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/timetable"
          element={
            <ProtectedRoute>
              <AdminTimetable />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/attendance"
          element={
            <ProtectedRoute>
              <AdminAttendanceReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/attendance/reports"
          element={
            <ProtectedRoute>
              <AdminAttendanceReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/messages"
          element={
            <ProtectedRoute>
              <AdminMessages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/messages/:id"
          element={
            <ProtectedRoute>
              <AdminMessages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/communications"
          element={
            <ProtectedRoute>
              <AdminCommunications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/lecturers"
          element={
            <ProtectedRoute>
              <AdminLecturers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/campuses"
          element={
            <ProtectedRoute>
              <AdminCampuses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/faculties"
          element={
            <ProtectedRoute>
              <AdminFaculties />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <ProtectedRoute>
              <AdminDepartments />
            </ProtectedRoute>
          }
        />

        {/* Institutional ID Cards Management */}
        <Route
          path="/admin/id-cards"
          element={
            <ProtectedRoute>
              <AdminIdCards />
            </ProtectedRoute>
          }
        />

        {/* Public & Privileged Credential Verification Gateway */}
        <Route path="/verify/id/:token" element={<VerifyIdCard />} />
        <Route path="/verify/scan" element={<VerifyIdCard />} />

        {/* Unified Portal & Auth Routes */}
        <Route path="/portal/login" element={<PortalLogin />} />
        <Route path="/login" element={<PortalLogin />} />

        {/* Lecturer Routes */}
        <Route path="/lecturer/login" element={<LecturerLogin />} />
        <Route path="/lecturer/dashboard" element={<ProtectedLecturerRoute><LecturerDashboard /></ProtectedLecturerRoute>} />
        <Route path="/lecturer/courses/:courseId" element={<ProtectedLecturerRoute><LecturerCourseDetails /></ProtectedLecturerRoute>} />
        <Route path="/lecturer/timetable" element={<ProtectedLecturerRoute><LecturerTimetable /></ProtectedLecturerRoute>} />
        <Route path="/lecturer/attendance" element={<ProtectedLecturerRoute><LecturerAttendance /></ProtectedLecturerRoute>} />

        {/* Student Routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/dashboard" element={<ProtectedStudentRoute><StudentDashboard /></ProtectedStudentRoute>} />
        <Route path="/student/finances" element={<ProtectedStudentRoute><StudentFinances /></ProtectedStudentRoute>} />
        <Route path="/student/courses" element={<ProtectedStudentRoute><StudentCourses /></ProtectedStudentRoute>} />
        <Route path="/student/profile" element={<ProtectedStudentRoute><StudentProfile /></ProtectedStudentRoute>} />
        <Route path="/student/exams" element={<ProtectedStudentRoute><StudentExams /></ProtectedStudentRoute>} />
        <Route path="/student/results" element={<ProtectedStudentRoute><StudentResults /></ProtectedStudentRoute>} />
        <Route path="/student/attendance" element={<ProtectedStudentRoute><StudentAttendance /></ProtectedStudentRoute>} />
        <Route path="/student/timetable" element={<ProtectedStudentRoute><StudentTimetable /></ProtectedStudentRoute>} />
        <Route path="/student/announcements" element={<ProtectedStudentRoute><StudentAnnouncements /></ProtectedStudentRoute>} />


        {/* Public Routes with Header/Footer */}
        <Route
          path="*"
          element={
            <div className="app-container">
              <Header />
              <main className="app-main">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/programmes" element={<Programmes />} />
                  <Route path="/programmes/:slug" element={<ProgrammeDetails />} />
                  <Route path="/apply" element={<Apply />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<ContactUs />} />
                  <Route path="/campuses" element={<Campuses />} />
                  <Route path="/campuses/:slug" element={<CampusDetails />} />
                  <Route path="/articles" element={<Articles />} />
                  <Route path="/articles/:slug" element={<ArticleView />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
              <WhatsAppCta />
            </div>
          }
        />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
