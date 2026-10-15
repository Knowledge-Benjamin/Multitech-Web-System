import { useState } from 'react'
import axios from 'axios'
import StudentSidebar from '../components/StudentSidebar'
import { useApiQuery } from '../hooks/useApiQuery'
import { BarChart2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Calendar, Clock, MapPin, Inbox } from 'lucide-react'
import './AdminDashboard.css'

const API = import.meta.env.VITE_API_URL

export default function StudentAttendance() {
  const token = localStorage.getItem('studentToken')
  const headers = { Authorization: `Bearer ${token}` }

  const { data, isLoading, error } = useApiQuery(`${API}/student-profile/attendance`, 'studentAttendance', {
    axiosOptions: { headers }
  })
  const stats = data?.data?.stats || []

  // Drilldown state
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [drilldownData, setDrilldownData] = useState([])
  const [drilldownLoading, setDrilldownLoading] = useState(false)

  const handleDrilldown = async (courseCode) => {
    if (selectedCourse === courseCode) {
      setSelectedCourse(null)
      return
    }
    
    setSelectedCourse(courseCode)
    setDrilldownLoading(true)
    try {
      const res = await axios.get(`${API}/student-profile/attendance/${courseCode}/drilldown`, { headers })
      if (res.data.success) {
        setDrilldownData(res.data.data.sessions || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setDrilldownLoading(false)
    }
  }

  return (
    <div className="scope-studentattendance scope-admindashboard admin-layout fade-in-section is-visible">
      <StudentSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)' }}>
        <header className="content-header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-secondary)', margin: '0 0 0.25rem 0' }}>Class Attendance Tracking</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Verified lecture attendance records and required minimum thresholds</p>
        </header>

        {error && <div className="message-error" style={{ marginBottom: '1.5rem' }}>Failed to load attendance statistics.</div>}

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading attendance data...</p>
          </div>
        ) : stats.length === 0 ? (
          <div className="empty-state" style={{ padding: '3.5rem', background: 'white', borderRadius: '16px', textAlign: 'center' }}>
            <Inbox size={40} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-secondary)' }}>No Attendance Records Found</h3>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Attendance has not yet been recorded for your enrolled courses this term.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
            {stats.map((stat, i) => (
              <div 
                key={i} 
                style={{ 
                  background: 'white', 
                  border: selectedCourse === stat.courseCode ? '1px solid var(--color-primary)' : '1px solid rgba(0,0,0,0.06)', 
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div 
                  onClick={() => handleDrilldown(stat.courseCode)}
                  style={{ 
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: selectedCourse === stat.courseCode ? 'rgba(0, 82, 204, 0.02)' : 'transparent'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.25rem' }}>
                      <span className="programme-tag" style={{ margin: 0 }}>{stat.courseCode}</span>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-secondary)' }}>{stat.courseName}</h3>
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{ height: '8px', width: '100%', maxWidth: '320px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginTop: '10px' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${stat.percentage}%`,
                        background: stat.percentage >= 75 ? '#059669' : stat.percentage >= 50 ? '#d97706' : '#dc2626',
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: '1.8rem', 
                        fontWeight: 800, 
                        color: stat.percentage >= 75 ? '#059669' : stat.percentage >= 50 ? '#d97706' : '#dc2626',
                        lineHeight: 1
                      }}>
                        {stat.percentage}%
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        {stat.attended} of {stat.total} Sessions Attended
                      </div>
                    </div>
                    <div>
                      {selectedCourse === stat.courseCode ? <ChevronUp size={20} className="text-blue" /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Drilldown details */}
                {selectedCourse === stat.courseCode && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '1.5rem', background: '#f8fafc' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'var(--color-secondary)' }}>
                      Verified Attendance History for {stat.courseCode}
                    </h4>
                    {drilldownLoading ? (
                      <p style={{ color: 'var(--color-text-secondary)' }}>Loading session records...</p>
                    ) : drilldownData.length === 0 ? (
                      <p style={{ color: 'var(--color-text-secondary)' }}>No detailed sessions recorded.</p>
                    ) : (
                      <div className="table-container">
                        <table className="modern-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Session Time</th>
                              <th>Room</th>
                              <th>Lecturer</th>
                              <th>Verification</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drilldownData.map((session, sIdx) => (
                              <tr key={sIdx}>
                                <td>{new Date(session.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                <td>{session.start_time} – {session.end_time}</td>
                                <td>{session.room_name || 'Assigned Lecture Room'}</td>
                                <td>{session.lecturer_name || 'Department Faculty'}</td>
                                <td>
                                  <span style={{ fontSize: '0.8rem', color: '#475569', textTransform: 'capitalize' }}>
                                    {session.verification_method || 'Verified'}
                                  </span>
                                </td>
                                <td>
                                  <span className={`status-pill status-${session.status === 'present' ? 'admitted' : 'rejected'}`} style={{ textTransform: 'capitalize' }}>
                                    {session.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
