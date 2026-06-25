import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Programmes from './pages/Programmes'
import ProgrammeDetails from './pages/ProgrammeDetails'
import Apply from './pages/Apply'
import NotFound from './pages/NotFound'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminProgrammes from './pages/AdminProgrammes'
import AdminFees from './pages/AdminFees'
import AdminApplications from './pages/AdminApplications'
import AdminCalendar from './pages/AdminCalendar'
import AdminStudents from './pages/AdminStudents'
import AdminAnnouncements from './pages/AdminAnnouncements'
import AdminArticles from './pages/AdminArticles'
import AdminAbout from './pages/AdminAbout'
import AdminAboutSections from './pages/AdminAboutSections'
import AdminSettings from './pages/AdminSettings'
import Articles from './pages/Articles'
import ArticleView from './pages/ArticleView'
import About from './pages/About'
import StudentLogin from './pages/StudentLogin'
import StudentDashboard from './pages/StudentDashboard'
import StudentFinances from './pages/StudentFinances'
import StudentProfile from './pages/StudentProfile'
import './App.css'

function App() {
  return (
    <BrowserRouter>
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
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <AdminSettings />
            </ProtectedRoute>
          }
        />

        {/* Student Routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/finances" element={<StudentFinances />} />
        <Route path="/student/profile" element={<StudentProfile />} />

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
                  <Route path="/programmes/:id" element={<ProgrammeDetails />} />
                  <Route path="/apply" element={<Apply />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/articles" element={<Articles />} />
                  <Route path="/articles/:id" element={<ArticleView />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
