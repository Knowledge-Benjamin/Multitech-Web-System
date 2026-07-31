import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
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
const Articles = lazy(() => import('./pages/Articles'))
const ArticleView = lazy(() => import('./pages/ArticleView'))
const About = lazy(() => import('./pages/About'))
const ContactUs = lazy(() => import('./pages/ContactUs'))
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

        {/* Lecturer Routes */}
        <Route path="/lecturer/login" element={<LecturerLogin />} />
        <Route path="/lecturer/dashboard" element={<LecturerDashboard />} />
        <Route path="/lecturer/courses/:courseId" element={<LecturerCourseDetails />} />
        <Route path="/lecturer/timetable" element={<LecturerTimetable />} />
        <Route path="/lecturer/attendance" element={<LecturerAttendance />} />

        {/* Student Routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/finances" element={<StudentFinances />} />
        <Route path="/student/courses" element={<StudentCourses />} />
        <Route path="/student/profile" element={<StudentProfile />} />
        <Route path="/student/exams" element={<StudentExams />} />
        <Route path="/student/results" element={<StudentResults />} />
        <Route path="/student/attendance" element={<StudentAttendance />} />
        <Route path="/student/timetable" element={<StudentTimetable />} />
        <Route path="/student/announcements" element={<StudentAnnouncements />} />

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
                  <Route path="/articles" element={<Articles />} />
                  <Route path="/articles/:slug" element={<ArticleView />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          }
        />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
