import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'
import { GraduationCap, BookOpen, Eye, EyeOff, ArrowLeft, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import './StudentLogin.css'

const API = import.meta.env.VITE_API_URL

export default function PortalLogin({ defaultTab }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const getInitialTab = () => {
    const queryTab = searchParams.get('tab') || searchParams.get('role')
    if (queryTab === 'lecturer' || queryTab === 'faculty') return 'lecturer'
    if (queryTab === 'student') return 'student'
    if (location.pathname.includes('/lecturer')) return 'lecturer'
    if (defaultTab) return defaultTab
    return 'student'
  }

  const [activeTab, setActiveTab] = useState(getInitialTab)

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
        setError(res.data.message || 'Authentication failed. Please verify your credentials.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your student number/email and password.')
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
        setError(res.data.message || 'Authentication failed. Please verify your credentials.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your faculty email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-screen auth-screen-portal">
      <Link to="/" className="auth-back-link">
        <ArrowLeft size={16} />
        <span>Back to website</span>
      </Link>

      <div className="auth-layout">
        <section className="auth-intro" aria-label="Multitech academic portal">
          <div className="auth-brand-lockup">
            <img src="/logo_asset.png" alt="" className="auth-brand-logo" />
            <span>Multitech<br />Business School</span>
          </div>

          <p className="auth-eyebrow">Academic portal</p>
          <h1>Everything you need to move <em>forward.</em></h1>
          <p className="auth-intro-copy">
            A secure place to follow your studies, stay informed, and keep your academic life in order.
          </p>
          <div className="auth-assurance">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Private access for students and faculty</span>
          </div>
        </section>

        <section className="auth-card" aria-labelledby="portal-login-title">
          <div className="auth-card-heading">
            <span className="auth-card-eyebrow">Welcome back</span>
            <h2 id="portal-login-title">Sign in to your portal</h2>
            <p>Choose your account type, then enter your credentials.</p>
          </div>

          <div className="portal-tab-switch" role="tablist" aria-label="Choose portal">
            <button
              type="button"
              role="tab"
              id="student-tab"
              aria-controls="student-login-panel"
              aria-selected={activeTab === 'student'}
              className={`portal-tab-btn ${activeTab === 'student' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('student')}
            >
              <GraduationCap size={18} aria-hidden="true" />
              <span>Student</span>
            </button>
            <button
              type="button"
              role="tab"
              id="faculty-tab"
              aria-controls="faculty-login-panel"
              aria-selected={activeTab === 'lecturer'}
              className={`portal-tab-btn ${activeTab === 'lecturer' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('lecturer')}
            >
              <BookOpen size={18} aria-hidden="true" />
              <span>Faculty</span>
            </button>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'student' ? (
            <form
              id="student-login-panel"
              role="tabpanel"
              aria-labelledby="student-tab"
              onSubmit={handleStudentSubmit}
              className="auth-form"
            >
              <div className="auth-field">
                <label htmlFor="student-id">Student number or email</label>
                <input
                  type="text"
                  id="student-id"
                  className="auth-input"
                  value={studentIdentifier}
                  onChange={(e) => setStudentIdentifier(e.target.value)}
                  placeholder="e.g. MBS/2026/0001 or name@example.com"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="student-password">Password</label>
                  <span>New applicants: use your reference number</span>
                </div>
                <div className="auth-password-wrap">
                  <input
                    type={showStudentPassword ? 'text' : 'password'}
                    id="student-password"
                    className="auth-input"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowStudentPassword(!showStudentPassword)}
                    aria-label={showStudentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showStudentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? <Loader2 size={18} className="auth-spinner" aria-hidden="true" /> : null}
                <span>{loading ? 'Signing in…' : 'Sign in to student portal'}</span>
              </button>
              <p className="auth-form-footer">
                New to Multitech? <Link to="/apply">Start an application</Link>
              </p>
            </form>
          ) : (
            <form
              id="faculty-login-panel"
              role="tabpanel"
              aria-labelledby="faculty-tab"
              onSubmit={handleLecturerSubmit}
              className="auth-form"
            >
              <div className="auth-field">
                <label htmlFor="lecturer-email">Faculty email address</label>
                <input
                  type="email"
                  id="lecturer-email"
                  className="auth-input"
                  value={lecturerEmail}
                  onChange={(e) => setLecturerEmail(e.target.value)}
                  placeholder="name@multitech.ac.ug"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="lecturer-password">Password</label>
                <div className="auth-password-wrap">
                  <input
                    type={showLecturerPassword ? 'text' : 'password'}
                    id="lecturer-password"
                    className="auth-input"
                    value={lecturerPassword}
                    onChange={(e) => setLecturerPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowLecturerPassword(!showLecturerPassword)}
                    aria-label={showLecturerPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLecturerPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? <Loader2 size={18} className="auth-spinner" aria-hidden="true" /> : null}
                <span>{loading ? 'Signing in…' : 'Sign in to faculty portal'}</span>
              </button>
              <p className="auth-form-footer">
                Need assistance? <Link to="/contact">Contact ICT support</Link>
              </p>
            </form>
          )}

          <p className="auth-privacy-note">Your sign-in is protected by Multitech Business School.</p>
        </section>
      </div>
    </main>
  )
}
