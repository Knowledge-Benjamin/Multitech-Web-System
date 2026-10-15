import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'
import { GraduationCap, BookOpen, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import './StudentLogin.css'

const API = import.meta.env.VITE_API_URL

export default function PortalLogin({ defaultTab }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // Determine initial active tab: query param (?tab= / ?role=), route path, or prop
  const getInitialTab = () => {
    const queryTab = searchParams.get('tab') || searchParams.get('role')
    if (queryTab === 'lecturer' || queryTab === 'faculty') return 'lecturer'
    if (queryTab === 'student') return 'student'
    if (location.pathname.includes('/lecturer')) return 'lecturer'
    if (defaultTab) return defaultTab
    return 'student'
  }

  const [activeTab, setActiveTab] = useState(getInitialTab)

  // Sync tab if URL route or query param changes
  useEffect(() => {
    const desiredTab = getInitialTab()
    if (desiredTab !== activeTab) {
      setActiveTab(desiredTab)
    }
  }, [location.pathname, searchParams])

  // Student form state
  const [studentIdentifier, setStudentIdentifier] = useState('')
  const [studentPassword, setStudentPassword] = useState('')
  const [showStudentPassword, setShowStudentPassword] = useState(false)

  // Lecturer form state
  const [lecturerEmail, setLecturerEmail] = useState('')
  const [lecturerPassword, setLecturerPassword] = useState('')
  const [showLecturerPassword, setShowLecturerPassword] = useState(false)

  // Feedback states
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleTabSwitch = (tab) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setError('')
    setSearchParams({ tab }, { replace: true })
  }

  // Handle Student Login
  const handleStudentSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await axios.post(`${API}/student-auth/login`, {
        email: studentIdentifier.trim(),
        student_number: studentIdentifier.trim(),
        password: studentPassword
      })

      if (res.data.success) {
        localStorage.setItem('studentToken', res.data.token)
        localStorage.setItem('studentUser', JSON.stringify(res.data.student))
        navigate('/student/dashboard')
      } else {
        setError(res.data.message || 'Login failed. Please check your credentials.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please verify your student number/email and password.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Lecturer Login
  const handleLecturerSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await axios.post(`${API}/lecturer/login`, {
        email: lecturerEmail.trim(),
        password: lecturerPassword
      })

      if (res.data.token) {
        localStorage.setItem('lecturerToken', res.data.token)
        localStorage.setItem('lecturerInfo', JSON.stringify(res.data.lecturer))
        navigate('/lecturer/dashboard')
      } else {
        setError(res.data.message || 'Login failed. Please check your credentials.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please verify your faculty email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="student-login-wrapper">
      <Link to="/" className="student-login-back">
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <div className="student-login-card">
        <div className="student-login-header">
          <h2>Portal Login</h2>
          <p>
            {activeTab === 'student'
              ? 'Access your academic records, finances & timetable'
              : 'Access course allocations, live attendance & grading'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="portal-tab-switch" role="tablist" aria-label="Portal Selection">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'student'}
            className={`portal-tab-btn ${activeTab === 'student' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('student')}
          >
            <GraduationCap size={18} />
            <span>Student Portal</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'lecturer'}
            className={`portal-tab-btn ${activeTab === 'lecturer' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('lecturer')}
          >
            <BookOpen size={18} />
            <span>Lecturer Portal</span>
          </button>
        </div>

        {error && (
          <div className="student-login-error" role="alert">
            {error}
          </div>
        )}

        {/* Student Login Form */}
        {activeTab === 'student' && (
          <form onSubmit={handleStudentSubmit} className="student-login-form">
            <div className="student-login-group">
              <label htmlFor="student-id">Email Address or Student Number</label>
              <input
                type="text"
                id="student-id"
                className="student-login-input"
                value={studentIdentifier}
                onChange={(e) => setStudentIdentifier(e.target.value)}
                placeholder="e.g. cbrainic@gmail.com or MBS/2026/0001"
                required
                autoComplete="username"
              />
            </div>

            <div className="student-login-group">
              <label htmlFor="student-password">Password (Reference Number)</label>
              <div className="portal-input-password-wrapper">
                <input
                  type={showStudentPassword ? 'text' : 'password'}
                  id="student-password"
                  className="student-login-input"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="portal-password-toggle"
                  onClick={() => setShowStudentPassword(!showStudentPassword)}
                  aria-label={showStudentPassword ? 'Hide password' : 'Show password'}
                >
                  {showStudentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="student-login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In to Student Portal'}
            </button>

            <div className="student-login-footer">
              <Link to="/apply">New student? Apply here.</Link>
            </div>
          </form>
        )}

        {/* Lecturer Login Form */}
        {activeTab === 'lecturer' && (
          <form onSubmit={handleLecturerSubmit} className="student-login-form">
            <div className="student-login-group">
              <label htmlFor="lecturer-email">Academic Email Address</label>
              <input
                type="email"
                id="lecturer-email"
                className="student-login-input"
                value={lecturerEmail}
                onChange={(e) => setLecturerEmail(e.target.value)}
                placeholder="lecturer@multitech.ac.ug"
                required
                autoComplete="email"
              />
            </div>

            <div className="student-login-group">
              <label htmlFor="lecturer-password">Password</label>
              <div className="portal-input-password-wrapper">
                <input
                  type={showLecturerPassword ? 'text' : 'password'}
                  id="lecturer-password"
                  className="student-login-input"
                  value={lecturerPassword}
                  onChange={(e) => setLecturerPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="portal-password-toggle"
                  onClick={() => setShowLecturerPassword(!showLecturerPassword)}
                  aria-label={showLecturerPassword ? 'Hide password' : 'Show password'}
                >
                  {showLecturerPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="student-login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In to Lecturer Portal'}
            </button>

            <div className="student-login-footer">
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Faculty member needing access assistance?{' '}
                <Link to="/contact" style={{ color: 'var(--color-accent-yellow, #f0c040)' }}>
                  Contact ICT Support
                </Link>
              </span>
            </div>
          </form>
        )}

        {/* Administrative Portal Link */}
        <div className="portal-admin-link">
          Administrative staff?
          <Link to="/admin/login">Access Admin Portal &rarr;</Link>
        </div>
      </div>
    </div>
  )
}
