import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, GraduationCap, CreditCard, Clock, CheckSquare,
  ArrowRight, ShieldCheck, AlertCircle, CheckCircle2, User, FileText
} from 'lucide-react'
import api from '../services/api'
import StudentSidebar from '../components/StudentSidebar'
import { useApiQuery } from '../hooks/useApiQuery'
import './AdminDashboard.css'
import './StudentDashboard.css'

const API = import.meta.env.VITE_API_URL

export default function StudentDashboard() {
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const studentUser = JSON.parse(localStorage.getItem('studentUser') || '{}')

  const token = localStorage.getItem('studentToken')
  const { data: resData, isLoading } = useApiQuery(`${API}/student-profile`, 'studentDashboardProfile', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })
  const data = resData?.data

  useEffect(() => {
    if (studentUser.must_change_password) {
      setShowPasswordModal(true)
    }
  }, [])

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordMessage('')
    setChangingPassword(true)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.')
      setChangingPassword(false)
      return
    }

    try {
      const res = await api.post('/student-auth/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      })

      if (res.data.success) {
        const updatedUser = { ...studentUser, must_change_password: false }
        localStorage.setItem('studentUser', JSON.stringify(updatedUser))
        setPasswordMessage('Password changed successfully.')
        setTimeout(() => setShowPasswordModal(false), 1800)
      } else {
        setPasswordError(res.data.message || 'Unable to update password')
      }
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Unable to update password')
    } finally {
      setChangingPassword(false)
    }
  }

  const studentName = data?.profile?.first_name
    ? `${data.profile.first_name} ${data.profile.last_name}`
    : (studentUser?.name || 'Student')
  const firstName = studentName.split(' ')[0]
  const studentNumber = data?.profile?.student_number || studentUser?.student_number || data?.profile?.reference_number || 'Enrolled'
  const enrollment = data?.currentEnrollment
  const financials = data?.financials

  return (
    <div className="scope-studentdashboard scope-admindashboard admin-layout fade-in-section is-visible">
      <StudentSidebar />

      <main className="admin-content student-dashboard-main">
        {/* Modern Hero Section matching Admin */}
        <header className="dashboard-hero fade-in-item">
          <div className="hero-content">
            <h1>Welcome back, {firstName}</h1>
            <p>
              Student Number: <strong>{studentNumber}</strong>
              {enrollment && (
                <> &bull; {enrollment.term_name} &bull; Year {enrollment.study_year}, Sem {enrollment.study_semester}</>
              )}
            </p>
          </div>
          <div className="hero-decoration"></div>
        </header>

        {/* First-Login Password Change Modal */}
        {showPasswordModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Update Your Password</h3>
              <p>For your security, please update your initial password before accessing your student records.</p>
              
              {passwordError && (
                <div className="message-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} /> {passwordError}
                </div>
              )}
              {passwordMessage && (
                <div className="message-success" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} /> {passwordMessage}
                </div>
              )}
              
              <form onSubmit={handlePasswordChange} className="password-form">
                <input 
                  type="password" 
                  placeholder="Current password (Reference number)" 
                  className="password-input"
                  value={passwordForm.oldPassword} 
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} 
                  required 
                />
                <input 
                  type="password" 
                  placeholder="New password" 
                  className="password-input"
                  value={passwordForm.newPassword} 
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                  required 
                />
                <input 
                  type="password" 
                  placeholder="Confirm new password" 
                  className="password-input"
                  value={passwordForm.confirmPassword} 
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
                  required 
                />
                <button type="submit" className="btn-update" disabled={changingPassword}>
                  {changingPassword ? 'Updating Password...' : 'Save Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading student records...</p>
          </div>
        ) : data?.isApplicantOnly ? (
          /* Applicant View */
          <div className="recent-section">
            <div className="section-header">
              <h2>Application Overview</h2>
              <span className={`status-pill status-${data.applicationInfo?.status || 'submitted'}`}>
                {data.applicationInfo?.status?.toUpperCase()}
              </span>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', border: '1px solid rgba(0,0,0,0.06)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Reference Number</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.25rem' }}>
                    {data.applicationInfo?.reference_number}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Intake</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.25rem' }}>
                    {data.applicationInfo?.intake_name || 'General Intake'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Payment Status</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    <span className={`status-pill status-${data.applicationInfo?.payment_status === 'paid' ? 'admitted' : 'pending'}`}>
                      {data.applicationInfo?.payment_status?.toUpperCase() || 'UNPAID'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="section-header">
              <h2>Programme Preferences</h2>
            </div>
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Preference</th>
                    <th>Programme</th>
                    <th>Campus</th>
                    <th>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {data.applicationChoices?.map((choice) => (
                    <tr key={choice.id}>
                      <td>
                        <strong>Choice {choice.preference_order}</strong>
                      </td>
                      <td>
                        <strong>{choice.programme_name}</strong>
                      </td>
                      <td>
                        <span>{choice.campus_name || 'Main Campus'}</span>
                      </td>
                      <td>
                        <span className={`status-pill status-${choice.status}`}>
                          {choice.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!data.applicationChoices?.length && (
                    <tr>
                      <td colSpan="4" className="empty-state">
                        <p>No programme choices recorded.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Full Enrolled Student View */
          <>
            {/* Top Stat Cards matching Admin Dashboard */}
            <div className="stats-grid fade-in-section is-visible">
              <Link to="/student/courses" className="stat-card fade-in-item">
                <div className="stat-icon-wrapper bg-blue">
                  <BookOpen size={24} className="text-blue" />
                </div>
                <div className="stat-content">
                  <h3>Enrolled Programme</h3>
                  <div className="stat-value-row">
                    <p className="stat-number" style={{ fontSize: '1.25rem', lineHeight: '1.3' }}>
                      {data?.profile?.programme_name || 'Active Study'}
                    </p>
                  </div>
                  <span className="trend positive" style={{ marginTop: '0.35rem' }}>
                    <ShieldCheck size={14} /> Registered
                  </span>
                </div>
              </Link>

              <Link to="/student/courses" className="stat-card fade-in-item">
                <div className="stat-icon-wrapper bg-indigo">
                  <GraduationCap size={24} className="text-indigo" />
                </div>
                <div className="stat-content">
                  <h3>Academic Standing</h3>
                  <div className="stat-value-row">
                    <p className="stat-number">
                      {enrollment ? `Year ${enrollment.study_year}` : 'Year 1'}
                    </p>
                    <span className="trend positive">
                      {enrollment ? `Sem ${enrollment.study_semester}` : 'Sem 1'}
                    </span>
                  </div>
                  <span className="trend neutral" style={{ marginTop: '0.35rem' }}>
                    {enrollment?.progression_status || 'Good Standing'}
                  </span>
                </div>
              </Link>

              <Link to="/student/finances" className="stat-card fade-in-item">
                <div className="stat-icon-wrapper bg-emerald">
                  <CreditCard size={24} className="text-emerald" />
                </div>
                <div className="stat-content">
                  <h3>Tuition &amp; Fees</h3>
                  <div className="stat-value-row">
                    <p className="stat-number" style={{ fontSize: '1.35rem' }}>
                      {financials ? `${financials.currency} ${Number(financials.totalDue).toLocaleString()}` : 'Cleared'}
                    </p>
                  </div>
                  <span className={`trend ${financials?.totalDue > 0 ? 'neutral' : 'positive'}`} style={{ marginTop: '0.35rem' }}>
                    {financials?.totalDue > 0 ? 'Balance Outstanding' : 'Fees Cleared'}
                  </span>
                </div>
              </Link>

              <Link to="/student/timetable" className="stat-card fade-in-item">
                <div className="stat-icon-wrapper bg-amber">
                  <Clock size={24} className="text-amber" />
                </div>
                <div className="stat-content">
                  <h3>Schedules</h3>
                  <div className="stat-value-row">
                    <p className="stat-number" style={{ fontSize: '1.2rem' }}>Class Timetable</p>
                  </div>
                  <span className="trend neutral" style={{ marginTop: '0.35rem' }}>
                    Active Term Schedules
                  </span>
                </div>
              </Link>
            </div>

            {/* Main Content Grid: Student Record & Financial Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              
              {/* Profile Card */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div className="stat-icon-wrapper bg-blue" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
                      <User size={20} className="text-blue" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-secondary)' }}>Student Identification</h3>
                  </div>
                  <Link to="/student/profile" className="btn-text" style={{ fontSize: '0.85rem' }}>
                    Full Profile <ArrowRight size={14} />
                  </Link>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Full Legal Name</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>{studentName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Student Number</span>
                    <strong style={{ fontFamily: 'monospace', letterSpacing: '0.5px', color: 'var(--color-primary)' }}>
                      {studentNumber}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Institutional Email</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{data?.profile?.email || studentUser.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Academic Programme</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)', textAlign: 'right', maxWidth: '60%' }}>
                      {data?.profile?.programme_name || 'Enrolled Programme'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Enrollment & Finance Status */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div className="stat-icon-wrapper bg-emerald" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
                      <FileText size={20} className="text-emerald" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-secondary)' }}>Current Academic Session</h3>
                  </div>
                  <Link to="/student/finances" className="btn-text" style={{ fontSize: '0.85rem' }}>
                    Invoices <ArrowRight size={14} />
                  </Link>
                </div>

                {enrollment ? (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Academic Term</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>{enrollment.term_name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Academic Year</span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{enrollment.year_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Progression Level</span>
                      <span className="status-pill status-admitted">
                        Year {enrollment.study_year} &bull; Semester {enrollment.study_semester}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Fees Status</span>
                      <span className={`status-pill status-${financials?.totalDue > 0 ? 'pending' : 'admitted'}`}>
                        {financials?.totalDue > 0 ? 'Balance Pending' : 'Cleared for Examinations'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                    No active term enrollment found for the current academic session.
                  </p>
                )}
              </div>

            </div>

            {/* Quick Links Section */}
            <section className="recent-section">
              <div className="section-header">
                <h2>Quick Portal Services</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Link to="/student/finances" className="stat-card" style={{ padding: '1.25rem' }}>
                  <div className="stat-icon-wrapper bg-emerald" style={{ width: '44px', height: '44px' }}>
                    <CreditCard size={20} className="text-emerald" />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', color: 'var(--color-text)' }}>Financial Ledger</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>View invoices &amp; payments</span>
                  </div>
                </Link>

                <Link to="/student/courses" className="stat-card" style={{ padding: '1.25rem' }}>
                  <div className="stat-icon-wrapper bg-blue" style={{ width: '44px', height: '44px' }}>
                    <BookOpen size={20} className="text-blue" />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', color: 'var(--color-text)' }}>Course Materials</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Syllabus &amp; lecture notes</span>
                  </div>
                </Link>

                <Link to="/student/timetable" className="stat-card" style={{ padding: '1.25rem' }}>
                  <div className="stat-icon-wrapper bg-amber" style={{ width: '44px', height: '44px' }}>
                    <Clock size={20} className="text-amber" />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', color: 'var(--color-text)' }}>Timetable</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Class &amp; room schedule</span>
                  </div>
                </Link>

                <Link to="/student/exams" className="stat-card" style={{ padding: '1.25rem' }}>
                  <div className="stat-icon-wrapper bg-indigo" style={{ width: '44px', height: '44px' }}>
                    <ShieldCheck size={20} className="text-indigo" />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', color: 'var(--color-text)' }}>Exams &amp; PIN</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Access exam clearance</span>
                  </div>
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
