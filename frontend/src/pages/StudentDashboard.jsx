import { useState, useEffect } from 'react'
import api from '../services/api'
import StudentSidebar from '../components/StudentSidebar'
import { useApiQuery } from '../hooks/useApiQuery'
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
  const { data: resData, isLoading } = useApiQuery(`${API}/student-profile`, {
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
        setPasswordMessage('Password changed successfully. You can continue using the portal.')
        setTimeout(() => setShowPasswordModal(false), 2000)
      } else {
        setPasswordError(res.data.message || 'Unable to change password')
      }
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Unable to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="admin-layout">
      <StudentSidebar />
      <main className="admin-content student-dashboard-main">
        <header className="dashboard-header">
          <h1>Welcome back, {studentUser?.name?.split(' ')[0] || 'Student'}</h1>
          <p>Here's what's happening with your academics today.</p>
        </header>

        {showPasswordModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Update Your Password</h3>
              <p>For your security, please change your password before continuing. Your current password is your reference number.</p>
              
              {passwordError && <div className="message-error" style={{ marginBottom: '1rem' }}>{passwordError}</div>}
              {passwordMessage && <div className="message-success" style={{ marginBottom: '1rem' }}>{passwordMessage}</div>}
              
              <form onSubmit={handlePasswordChange} className="password-form">
                <input 
                  type="password" 
                  placeholder="Current password" 
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
                  {changingPassword ? 'Updating Securely...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0, 82, 204, 0.1)', borderLeftColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div className="student-grid">
            
            {/* Profile Widget */}
            <div className="student-card">
              <div className="card-header">
                <div className="card-icon icon-blue">👤</div>
                <h3>Student Profile</h3>
              </div>
              {data && data.profile ? (
                <div className="detail-list">
                  <div className="detail-item">
                    <span className="detail-label">Full Name</span>
                    <span className="detail-value">{data.profile.first_name} {data.profile.last_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Programme</span>
                    <span className="detail-value">{data.profile.programme_name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{data.profile.email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Student ID</span>
                    <span className="detail-value" style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>
                      {data.profile.reference_number || studentUser.username}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted">Profile data unavailable.</p>
              )}
            </div>

            {/* Academic Status Widget */}
            <div className="student-card">
              <div className="card-header">
                <div className="card-icon icon-purple">🎓</div>
                <h3>Academic Status</h3>
              </div>
              {data && data.currentEnrollment ? (
                <div className="detail-list">
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <div><span className="status-badge">{data.currentEnrollment.progression_status}</span></div>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Current Academic Year</span>
                    <span className="detail-value">{data.currentEnrollment.year_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Current Semester</span>
                    <span className="detail-value">{data.currentEnrollment.term_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Progression Level</span>
                    <span className="detail-value">Year {data.currentEnrollment.study_year} • Semester {data.currentEnrollment.study_semester}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted">No active enrollment for the current term.</p>
              )}
            </div>

            {/* Financial Summary Widget */}
            <div className="student-card">
              <div className="card-header">
                <div className="card-icon icon-green">💳</div>
                <h3>Financial Overview</h3>
              </div>
              {data && data.financials ? (
                <div>
                  <span className="detail-label">Total Outstanding Balance</span>
                  <div className="financial-amount">
                    <span className="financial-currency">{data.financials.currency}</span>
                    {Number(data.financials.totalDue).toLocaleString()}
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '1rem', lineHeight: 1.5 }}>
                    Please ensure your fees are cleared before the examination period begins to avoid any inconveniences.
                  </p>
                </div>
              ) : (
                <p className="text-muted">Financial data unavailable.</p>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
