import { useState } from 'react'
import axios from 'axios'
import StudentSidebar from '../components/StudentSidebar'
import { useApiQuery } from '../hooks/useApiQuery'
import { 
  BarChart2, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Clock, 
  MapPin, 
  Inbox, 
  Radio, 
  KeyRound, 
  Loader2, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react'
import './AdminDashboard.css'

const API = import.meta.env.VITE_API_URL

export default function StudentAttendance() {
  const token = localStorage.getItem('studentToken')
  const headers = { Authorization: `Bearer ${token}` }

  // Attendance stats
  const { data, isLoading, error, refetch: refetchAttendance } = useApiQuery(
    `${API}/student-profile/attendance`, 
    'studentAttendance', 
    { axiosOptions: { headers } }
  )
  const stats = data?.data?.stats || []

  // Active Sessions for Live Check-in
  const { 
    data: activeData, 
    isLoading: loadingActive, 
    refetch: refetchActive 
  } = useApiQuery(
    '/attendance/active', 
    'studentActiveSessions', 
    { 
      axiosOptions: { headers },
      queryOptions: { refetchInterval: 12000 }
    }
  )
  const activeSessions = activeData?.sessions || activeData?.data?.sessions || []

  // Check-in State
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [tokenInput, setTokenInput] = useState('')
  const [manualSessionId, setManualSessionId] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState({ state: 'idle', message: '' }) // idle | submitting | success | error

  // Drilldown State
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [drilldownData, setDrilldownData] = useState([])
  const [drilldownLoading, setDrilldownLoading] = useState(false)

  const handleDrilldown = async (courseCode, forceOpen = false) => {
    if (selectedCourse === courseCode && !forceOpen) {
      setSelectedCourse(null)
      return
    }
    
    setSelectedCourse(courseCode)
    setDrilldownLoading(true)
    try {
      const res = await axios.get(`${API}/student-profile/attendance/${courseCode}/drilldown`, { headers })
      if (res.data.success) {
        const sessions = Array.isArray(res.data.data) 
          ? res.data.data 
          : (res.data.data?.sessions || res.data.sessions || [])
        setDrilldownData(sessions)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setDrilldownLoading(false)
    }
  }

  const handleCheckInSubmit = async (targetSessionId, tokenVal) => {
    const cleanToken = (tokenVal || '').trim().toLowerCase()
    if (!cleanToken) {
      setCheckInStatus({ state: 'error', message: 'Please enter the rotating token displayed in class.' })
      return
    }
    if (!targetSessionId) {
      setCheckInStatus({ state: 'error', message: 'Please select or specify a valid class session.' })
      return
    }

    setCheckInStatus({ state: 'submitting', message: 'Verifying class attendance and location...' })

    let latitude = null
    let longitude = null

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 6000,
            enableHighAccuracy: true
          })
        })
        latitude = pos.coords.latitude
        longitude = pos.coords.longitude
      } catch (geoErr) {
        // Continue check-in even if browser GPS permission is denied
        console.warn('Geolocation unavailable for check-in:', geoErr.message)
      }
    }

    try {
      const res = await axios.post(
        `${API}/attendance/submit`,
        {
          sessionId: targetSessionId,
          qrToken: cleanToken,
          latitude,
          longitude
        },
        { headers }
      )

      if (res.data.success) {
        setCheckInStatus({
          state: 'success',
          message: 'Attendance Verified! You are recorded as Present.'
        })
        setTokenInput('')
        setActiveSessionId(null)
        refetchAttendance()
        refetchActive()
        if (selectedCourse) {
          handleDrilldown(selectedCourse, true)
        }
      } else {
        setCheckInStatus({
          state: 'error',
          message: res.data.error || 'Attendance verification failed.'
        })
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Check-in failed. Please verify the code on screen and try again.'
      setCheckInStatus({ state: 'error', message: msg })
    }
  }

  return (
    <div className="scope-studentattendance scope-admindashboard admin-layout fade-in-section is-visible">
      <StudentSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)' }}>
        <header className="content-header" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-secondary)', margin: '0 0 0.25rem 0' }}>
                Class Attendance Tracking
              </h1>
              <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                Verified lecture attendance records and minimum threshold compliance (75% required for exam clearance)
              </p>
            </div>
            <button 
              onClick={() => { refetchAttendance(); refetchActive(); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: 'white',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              <RefreshCw size={14} /> Refresh Data
            </button>
          </div>
        </header>

        {/* ── Live Class Check-In Card ────────────────────────────────────── */}
        <section style={{ marginBottom: '2rem' }}>
          {activeSessions.length > 0 ? (
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: '16px',
              padding: '1.75rem',
              color: 'white',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '180px',
                height: '180px',
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#4ade80',
                    boxShadow: '0 0 10px #4ade80'
                  }}></span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', color: '#4ade80', textTransform: 'uppercase' }}>
                    Live Lecture In Session
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {activeSessions.length} active class{activeSessions.length > 1 ? 'es' : ''} available
                </span>
              </div>

              {activeSessions.map((act) => {
                const isSelected = activeSessionId === act.session_id || (activeSessions.length === 1 && !activeSessionId)
                const currentSessId = act.session_id

                return (
                  <div 
                    key={act.session_id} 
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: isSelected ? '1px solid rgba(96, 165, 250, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      marginBottom: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            background: 'rgba(59, 130, 246, 0.25)',
                            color: '#93c5fd',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            padding: '2px 8px',
                            borderRadius: '6px'
                          }}>
                            {act.course_code}
                          </span>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 600 }}>
                            {act.course_name}
                          </h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#94a3b8', fontSize: '0.82rem', marginTop: '6px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} style={{ color: '#60a5fa' }} /> {act.room_name || 'Classroom'}
                          </span>
                          <span>&bull;</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={13} style={{ color: '#60a5fa' }} /> {act.start_time ? new Date(act.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active now'}
                          </span>
                          <span>&bull;</span>
                          <span>Lecturer: {act.lecturer_name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Check-in input form */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '10px 14px',
                      borderRadius: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px' }}>
                        <KeyRound size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                        <input
                          type="text"
                          maxLength={8}
                          placeholder="Enter 8-character token (e.g. e4a1b9)"
                          value={isSelected ? tokenInput : ''}
                          onChange={(e) => {
                            setActiveSessionId(currentSessId)
                            setTokenInput(e.target.value.toUpperCase())
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            letterSpacing: '0.1em',
                            outline: 'none',
                            width: '100%',
                            fontFamily: 'monospace'
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCheckInSubmit(currentSessId, isSelected ? tokenInput : '')}
                        disabled={checkInStatus.state === 'submitting'}
                        style={{
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          padding: '8px 18px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: checkInStatus.state === 'submitting' ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'background 0.2s'
                        }}
                      >
                        {checkInStatus.state === 'submitting' ? (
                          <>
                            <Loader2 size={14} className="spinner" /> Verifying...
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={15} /> Check In Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Status Message */}
              {checkInStatus.state !== 'idle' && (
                <div style={{
                  marginTop: '1rem',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: checkInStatus.state === 'success' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                  border: checkInStatus.state === 'success' ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(248, 113, 113, 0.3)',
                  color: checkInStatus.state === 'success' ? '#4ade80' : '#f87171'
                }}>
                  {checkInStatus.state === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{checkInStatus.message}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b'
                }}>
                  <Radio size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-secondary)' }}>
                    No Active Lecture Session Detected
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    Live check-in opens automatically when your lecturer starts an attendance session.
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #cbd5e1',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {showManualInput ? 'Hide Manual Check-in' : 'Enter Session Code Manually'}
                </button>
              </div>

              {showManualInput && (
                <div style={{ width: '100%', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #e2e8f0', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    placeholder="Session ID"
                    value={manualSessionId}
                    onChange={(e) => setManualSessionId(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', width: '120px' }}
                  />
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="8-char token"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', width: '140px', fontFamily: 'monospace' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCheckInSubmit(manualSessionId, tokenInput)}
                    style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Submit
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Attendance Records Section ─────────────────────────────────── */}
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
                            {drilldownData.map((session, sIdx) => {
                              const isPresent = String(session.status).toLowerCase() === 'present'
                              return (
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
                                    <span 
                                      className={`status-pill ${isPresent ? 'status-admitted' : 'status-rejected'}`} 
                                      style={{ textTransform: 'capitalize' }}
                                    >
                                      {session.status}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
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
