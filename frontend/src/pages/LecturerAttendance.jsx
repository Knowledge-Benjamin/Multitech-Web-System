import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts'
import axios from 'axios'
import { useApiQuery } from '../hooks/useApiQuery'
import QRCode from 'qrcode'
import './LecturerAttendance.css'

const API = import.meta.env.VITE_API_URL

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function LecturerAttendance() {
  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [session, setSession] = useState(null)
  const [scheduleInfo, setScheduleInfo] = useState(null)
  const [qrToken, setQrToken] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [windowIndex, setWindowIndex] = useState(0)
  const [countdown, setCountdown] = useState(5)
  const [meshRunning, setMeshRunning] = useState(false)
  const [meshDone, setMeshDone] = useState(false)
  const [verifiedCount, setVerifiedCount] = useState(0)
  const [mapData, setMapData] = useState([])
  const [error, setError] = useState('')
  const [bleStatus, setBleStatus] = useState('idle') // idle | checking | granted | denied | unavailable
  const [gpsStatus, setGpsStatus] = useState('idle') // idle | checking | granted | denied
  const [permissionsReady, setPermissionsReady] = useState(false)
  const eventSourceRef = useRef(null)
  const countdownRef = useRef(null)
  const token = localStorage.getItem('lecturerToken')

  const info = JSON.parse(localStorage.getItem('lecturerInfo') || '{}')
  const lecturerId = info.id || null
  const { data: resData, isLoading: loadingSchedules, error: queryError } = useApiQuery(
    lecturerId ? `/timetable/schedules?lecturerId=${lecturerId}` : null,
    ['lecturerSchedules', lecturerId],
    { axiosOptions: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const schedules = resData?.schedules || []
  const displayError = error || (queryError ? 'Could not load your class schedules. Please contact the administrator.' : '')

  // Auto-select if only one schedule
  useEffect(() => {
    if (schedules.length === 1 && !selectedScheduleId) {
      setSelectedScheduleId(String(schedules[0].id))
    }
  }, [schedules, selectedScheduleId])

  // Update selectedSchedule object whenever dropdown changes
  useEffect(() => {
    const found = schedules.find(s => String(s.id) === String(selectedScheduleId))
    setSelectedSchedule(found || null)
  }, [selectedScheduleId, schedules])

  // Render QR canvas whenever token changes
  useEffect(() => {
    if (!qrToken) return
    QRCode.toDataURL(qrToken, {
      width: 320,
      margin: 2,
      color: { dark: '#1e3a5f', light: '#ffffff' }
    }).then(url => setQrDataUrl(url))
  }, [qrToken])

  const getPermissions = async () => {
    let bleOk = false
    let gpsOk = false

    // --- GPS ---
    setGpsStatus('checking')
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      })
      setGpsStatus('granted')
      gpsOk = true
    } catch {
      setGpsStatus('denied')
    }

    // --- Bluetooth ---
    setBleStatus('checking')
    if (!navigator.bluetooth) {
      setBleStatus('unavailable')
      bleOk = true // QR-only fallback on devices without BLE
    } else {
      try {
        await navigator.bluetooth.requestDevice({ acceptAllDevices: true })
        setBleStatus('granted')
        bleOk = true
      } catch (err) {
        if (err.name === 'NotFoundError') {
          // User dismissed picker — permission is still accessible
          setBleStatus('granted')
          bleOk = true
        } else {
          setBleStatus('denied')
        }
      }
    }

    return { bleOk, gpsOk }
  }

  const startSession = async () => {
    if (!selectedScheduleId) {
      setError('Please select a class schedule first.')
      return
    }
    setError('')

    // If permissions not yet granted, request them now
    let ready = permissionsReady
    if (!ready) {
      const { bleOk, gpsOk } = await getPermissions()
      if (!gpsOk) {
        setError('Location (GPS) permission is required to start an attendance session. Please allow it in your browser and try again.')
        return
      }
      if (!bleOk) {
        setError('Bluetooth permission was denied. Please enable Bluetooth and try again.')
        return
      }
      setPermissionsReady(true)
      ready = true
    }

    // Start the session
    try {
      const res = await axios.post(
        `${API}/attendance/start`,
        { scheduleId: selectedScheduleId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSession({ sessionId: res.data.sessionId })
      setScheduleInfo(res.data.scheduleInfo)
      setMeshDone(false)
      setVerifiedCount(0)
      setMapData([])
      connectSSE(res.data.sessionId)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start session.')
    }
  }


  const connectSSE = useCallback((sessionId) => {
    if (eventSourceRef.current) eventSourceRef.current.close()
    const es = new EventSource(`${API}/attendance/stream/${sessionId}`)
    eventSourceRef.current = es
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setQrToken(data.token)
      setWindowIndex(data.windowIndex)
      setCountdown(5)
    }
    es.onerror = () => es.close()
  }, [])

  // Countdown ticker
  useEffect(() => {
    if (!session) return
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : 5))
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [session, windowIndex])

  const endSession = async () => {
    if (!session) return
    setMeshRunning(true)
    setError('')
    try {
      const res = await axios.post(
        `${API}/attendance/end/${session.sessionId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setVerifiedCount(res.data.verifiedCount || 0)
      setMapData(res.data.mapData || [])
      setMeshDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to finalize session.')
    } finally {
      setMeshRunning(false)
      if (eventSourceRef.current) eventSourceRef.current.close()
      setSession(null)
      setQrToken(null)
      setQrDataUrl(null)
    }
  }

  const formatTime = (t) => t ? t.substring(0, 5) : ''

  // Visual UI aid only (backend does actual strict enforcement)
  const getScheduleState = (s) => {
    const now = new Date()
    const currentDay = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1] // map JS getDay() to Monday-start array
    if (s.day_of_week !== currentDay) return { text: 'Not Today', color: '#64748b', bg: 'transparent', border: '#334155' }

    const currentMins = now.getHours() * 60 + now.getMinutes()
    const [startH, startM] = String(s.start_time).split(':').map(Number)
    const [endH, endM] = String(s.end_time).split(':').map(Number)
    const startMins = startH * 60 + startM
    const endMins = endH * 60 + endM

    if (currentMins < startMins - 15) return { text: 'Upcoming', color: '#facc15', bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.3)' }
    if (currentMins > endMins + 30) return { text: 'Ended', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' }
    return { text: 'Active Now', color: '#4ade80', bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.4)' }
  }

  return (
    <div className="la-page">
      {/* ── Left Panel ────────────────────────────────────────────────────── */}
      <div className="la-left">
        <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link to="/lecturer/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <span>◀</span> Back to Dashboard
          </Link>
        </div>

        <div className="la-card la-setup-card">
          <h2 className="la-title">📡 Attendance Session</h2>
          <p className="la-subtitle">
            Select one of your scheduled classes to begin a live BLE + GPS + QR attendance session.
          </p>

          {displayError && <div className="la-error">{displayError}</div>}

          {/* Schedule Selector */}
          <label className="la-label">Your Scheduled Classes</label>
          {loadingSchedules ? (
            <p className="la-muted">Loading your schedules...</p>
          ) : schedules.length === 0 ? (
            <div className="la-no-schedules">
              ℹ️ You have no class schedules assigned. Ask an administrator to set up the timetable.
            </div>
          ) : (
            <div className="la-schedule-list">
              {DAYS.map(day => {
                const daySchedules = schedules.filter(s => s.day_of_week === day)
                if (daySchedules.length === 0) return null
                return (
                  <div key={day} className="la-day-group">
                    <span className="la-day-label">{day}</span>
                    {daySchedules.map(s => (
                      <div
                        key={s.id}
                        className={`la-schedule-item ${String(selectedScheduleId) === String(s.id) ? 'selected' : ''} ${session ? 'disabled' : ''}`}
                        onClick={() => !session && setSelectedScheduleId(String(s.id))}
                      >
                        <div className="la-sched-course">
                          <strong>{s.course_code}</strong> — {s.course_name}
                        </div>
                        <div className="la-sched-meta">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                              🕒 {formatTime(s.start_time)}–{formatTime(s.end_time)} &nbsp;|&nbsp;
                              📍 {s.room_name}{s.building ? `, ${s.building}` : ''}
                            </span>
                            {(() => {
                              const st = getScheduleState(s)
                              return (
                                <span style={{
                                  fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px',
                                  color: st.color, background: st.bg, border: `1px solid ${st.border}`
                                }}>
                                  {st.text}
                                </span>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          <div className="la-actions">
            {!session ? (
              <>
                {/* Permission Status Indicators */}
                {(gpsStatus !== 'idle' || bleStatus !== 'idle') && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem' }}>📍</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: gpsStatus === 'granted' ? '#4ade80' : gpsStatus === 'denied' ? '#f87171' : '#facc15' }}>
                        {gpsStatus === 'checking' ? 'Checking...' : gpsStatus === 'granted' ? '✓ GPS Ready' : '✗ GPS Denied'}
                      </div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem' }}>🔵</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: (bleStatus === 'granted' || bleStatus === 'unavailable') ? '#4ade80' : bleStatus === 'denied' ? '#f87171' : '#facc15' }}>
                        {bleStatus === 'checking' ? 'Checking...' : bleStatus === 'granted' ? '✓ BT Ready' : bleStatus === 'unavailable' ? '~ BT N/A' : '✗ BT Denied'}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="la-btn la-btn-start"
                  onClick={startSession}
                  style={{
                    opacity: (gpsStatus === 'checking' || bleStatus === 'checking') ? 0.7 : 1,
                    cursor: (gpsStatus === 'checking' || bleStatus === 'checking') ? 'wait' : 'pointer',
                    animation: !selectedScheduleId ? 'none' : undefined
                  }}
                >
                  {(gpsStatus === 'checking' || bleStatus === 'checking')
                    ? '⏳ Requesting Permissions...'
                    : !selectedScheduleId
                      ? '← Select a class above first'
                      : '▶ Start Session'}
                </button>
              </>


            ) : (
              <button
                className="la-btn la-btn-end"
                onClick={endSession}
                disabled={meshRunning}
              >
                {meshRunning ? '⚙ Running Mesh Analysis...' : '⏹ End Session & Finalise'}
              </button>
            )}
          </div>

        </div>

        {/* Active Session Info */}
        {session && scheduleInfo && (
          <div className="la-card la-active-card">
            <div className="la-badge la-badge-live">● SESSION ACTIVE</div>
            <h4 className="la-active-course">{scheduleInfo.courseCode} — {scheduleInfo.courseName}</h4>
            <p className="la-active-meta">📍 {scheduleInfo.roomName} &nbsp;|&nbsp; 📅 {scheduleInfo.dayOfWeek}</p>
            <p className="la-active-hint">
              Keep this browser tab open. The QR code updates automatically every 5 seconds.
            </p>
          </div>
        )}

        {/* Mesh Results */}
        {meshDone && (
          <div className="la-card la-result-card">
            <div className="la-result-icon">✅</div>
            <h3>Analysis Complete</h3>
            <p className="la-verified-count">
              <span>{verifiedCount}</span>
              <small>students verified present</small>
            </p>
            <p className="la-result-info">
              Attendance committed via BLE + GPS + QR Recursive Trilateration.
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="la-card la-legend-card">
          <h4>How Students Check In</h4>
          <ul className="la-legend">
            <li><span className="dot dot-blue"></span> Open the student mobile app</li>
            <li><span className="dot dot-green"></span> Enable Bluetooth + GPS</li>
            <li><span className="dot dot-orange"></span> Scan this QR code + verify fingerprint</li>
            <li><span className="dot dot-purple"></span> Mesh sync happens in background</li>
          </ul>
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────── */}
      <div className="la-right">
        {meshDone ? (
          <div className="la-mesh-done-state" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '2rem 2rem 0 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
              <h2>Session Finalized</h2>
              <p>{verifiedCount} students successfully verified via BLE Mesh.</p>
            </div>
            
            <div style={{ flex: 1, minHeight: 0, padding: '1rem', marginTop: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'left', paddingLeft: '1rem' }}>
                📡 Spatial Mesh Heatmap
              </h3>
              <ResponsiveContainer width="100%" height="90%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis type="number" dataKey="x" name="X" hide domain={['dataMin - 1', 'dataMax + 1']} />
                  <YAxis type="number" dataKey="y" name="Row" reversed hide domain={[0, 'dataMax + 1']} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                    formatter={(val, name, props) => [`Student ID: ${props.payload.studentId}`, '']}
                    labelFormatter={() => ''}
                  />
                  <ReferenceDot x={0} y={0} r={8} fill="#ef4444" stroke="none" />
                  <text x="50%" y="95%" textAnchor="middle" fill="#ef4444" fontSize={12}>Lecturer Desk</text>
                  <Scatter name="Students" data={mapData} fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : !session ? (
          <div className="la-qr-placeholder">
            <div className="la-qr-idle-icon">📡</div>
            <p>Select a class and start a session to generate the live QR code</p>
          </div>
        ) : (
          <div className="la-qr-live">
            {/* Countdown ring */}
            <div className="la-countdown-wrapper">
              <svg className="la-countdown-svg" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" className="la-ring-bg" />
                <circle
                  cx="60" cy="60" r="54"
                  className="la-ring-progress"
                  strokeDasharray="339.3"
                  strokeDashoffset={339.3 - (countdown / 5) * 339.3}
                />
              </svg>
              <span className="la-countdown-num">{countdown}</span>
            </div>

            <div className="la-qr-frame">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Live QR Code" className="la-qr-img" />
              ) : (
                <div className="la-qr-generating">Generating...</div>
              )}
            </div>

            <div className="la-session-info">
              <span className="la-badge la-badge-live">● LIVE</span>
              <span className="la-window-info">
                Window #{windowIndex} &nbsp;·&nbsp; Token: <code>{qrToken}</code>
              </span>
            </div>

            <div className="la-ble-notice">
              📶 Remind students: Bluetooth AND GPS must be active before scanning
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
