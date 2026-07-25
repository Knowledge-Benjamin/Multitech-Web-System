import { useState, useEffect } from 'react'
import axios from 'axios'
import StudentSidebar from '../components/StudentSidebar'

const API = import.meta.env.VITE_API_URL

export default function StudentAttendance() {
  const token = localStorage.getItem('studentToken')
  const headers = { Authorization: `Bearer ${token}` }

  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Drilldown state
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [drilldownData, setDrilldownData] = useState([])
  const [drilldownLoading, setDrilldownLoading] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API}/student-profile/attendance`, { headers })
        setStats(res.data.data.stats || [])
      } catch (err) {
        setError('Failed to load attendance statistics.')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const handleDrilldown = async (courseCode) => {
    if (selectedCourse === courseCode) {
      setSelectedCourse(null) // toggle off
      return
    }
    
    setSelectedCourse(courseCode)
    setDrilldownLoading(true)
    try {
      const res = await axios.get(`${API}/student-profile/attendance/${courseCode}/drilldown`, { headers })
      setDrilldownData(res.data.data)
    } catch (err) {
      alert('Failed to load session details.')
    } finally {
      setDrilldownLoading(false)
    }
  }

  return (
    <div className="student-layout">
      <StudentSidebar />
      <main className="student-content" style={{ background: '#0f172a', padding: '2rem', color: '#f1f5f9' }}>
        <h1 style={{ margin: '0 0 0.5rem 0' }}>📈 My Attendance</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 2rem 0' }}>Track your presence across all registered courses. Click on a course to view session details.</p>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? <p>Loading...</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            {stats.map((stat, i) => (
              <div key={i} style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: selectedCourse === stat.courseCode ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'border-color 0.3s ease'
              }}>
                <div 
                  onClick={() => handleDrilldown(stat.courseCode)}
                  style={{ 
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: selectedCourse === stat.courseCode ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.2rem', color: '#e2e8f0' }}>{stat.courseCode}</h3>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '12px' }}>{stat.courseName}</div>
                    
                    {/* Progress Bar */}
                    <div style={{ height: '6px', width: '100%', maxWidth: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${stat.percentage}%`,
                        background: stat.percentage >= 75 ? '#10b981' : stat.percentage >= 50 ? '#f59e0b' : '#ef4444',
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '1.8rem', 
                      fontWeight: 800, 
                      color: stat.percentage >= 75 ? '#10b981' : stat.percentage >= 50 ? '#f59e0b' : '#ef4444',
                      lineHeight: 1
                    }}>
                      {stat.percentage}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
                      {stat.attended} / {stat.total} sessions
                    </div>
                  </div>
                </div>

                {/* Drilldown Section */}
                {selectedCourse === stat.courseCode && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', padding: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#e2e8f0' }}>Session Details</h4>
                    
                    {drilldownLoading ? (
                      <p style={{ color: '#94a3b8' }}>Loading sessions...</p>
                    ) : drilldownData.length === 0 ? (
                      <p style={{ color: '#94a3b8' }}>No completed sessions found for this course.</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                            <th style={{ padding: '8px', fontWeight: 500 }}>Date</th>
                            <th style={{ padding: '8px', fontWeight: 500 }}>Time</th>
                            <th style={{ padding: '8px', fontWeight: 500 }}>Room</th>
                            <th style={{ padding: '8px', fontWeight: 500 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drilldownData.map(session => (
                            <tr key={session.session_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '12px 8px', color: '#e2e8f0' }}>{new Date(session.date).toLocaleDateString()}</td>
                              <td style={{ padding: '12px 8px', color: '#94a3b8' }}>{session.start_time} - {session.end_time}</td>
                              <td style={{ padding: '12px 8px', color: '#94a3b8' }}>{session.room}</td>
                              <td style={{ padding: '12px 8px' }}>
                                {session.status === 'Present' ? (
                                  <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Present</span>
                                ) : (
                                  <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Absent</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {stats.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                No attendance records found. Classes may not have started yet.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
