import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  BarChart2, 
  Users, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  BookOpen, 
  TrendingUp,
  X,
  Search
} from 'lucide-react'
import './AdminDashboard.css'

const API = import.meta.env.VITE_API_URL

export default function AdminAttendanceReports() {
  const token = localStorage.getItem('adminToken')
  const headers = { Authorization: `Bearer ${token}` }

  // Main navigation tab: 'occurrence' | 'historical'
  const [activeTab, setActiveTab] = useState('occurrence')

  // --- Tab 1: Occurrence Tracking State ---
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [occurrenceData, setOccurrenceData] = useState(null)
  const [loadingOccurrence, setLoadingOccurrence] = useState(false)
  const [occurrenceError, setOccurrenceError] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchFilter, setSearchFilter] = useState('')

  // --- Tab 2: Historical Sessions State ---
  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessionsError, setSessionsError] = useState('')

  // Modal / Detail state for single session roll call
  const [selectedSession, setSelectedSession] = useState(null)
  const [records, setRecords] = useState([])
  const [loadingRecords, setLoadingRecords] = useState(false)

  // Fetch occurrence tracking data
  const loadOccurrenceTracking = async (dateStr) => {
    setLoadingOccurrence(true)
    setOccurrenceError('')
    try {
      const res = await axios.get(`${API}/attendance/timetable-tracking?date=${dateStr}`, { headers })
      if (res.data.success) {
        setOccurrenceData(res.data.data)
      }
    } catch (err) {
      setOccurrenceError(err.response?.data?.message || err.response?.data?.error || 'Failed to load occurrence data.')
    } finally {
      setLoadingOccurrence(false)
    }
  }

  // Fetch historical sessions
  const loadSessions = async () => {
    setLoadingSessions(true)
    setSessionsError('')
    try {
      const res = await axios.get(`${API}/attendance/sessions`, { headers })
      setSessions(res.data.sessions || [])
    } catch (err) {
      setSessionsError('Failed to load historical sessions')
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    loadOccurrenceTracking(selectedDate)
    loadSessions()
  }, [])

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate)
    loadOccurrenceTracking(newDate)
  }

  const shiftDate = (offsetDays) => {
    const cur = new Date(selectedDate)
    cur.setDate(cur.getDate() + offsetDays)
    const nextStr = cur.toISOString().split('T')[0]
    handleDateChange(nextStr)
  }

  const handleViewSession = async (sessionOrId) => {
    const sessId = typeof sessionOrId === 'object' ? sessionOrId.id : sessionOrId
    setSelectedSession(sessionOrId)
    setLoadingRecords(true)
    try {
      const res = await axios.get(`${API}/attendance/sessions/${sessId}`, { headers })
      setRecords(res.data.records || [])
      // If triggered from occurrence tab, we can open the detail inspector
    } catch (err) {
      alert('Failed to load roll call records for this session.')
    } finally {
      setLoadingRecords(false)
    }
  }

  const mapData = records
    .filter(r => r.x_coord !== null && r.y_coord !== null)
    .map(r => ({ x: Number(r.x_coord), y: Number(r.y_coord), name: r.student_name || r.username || r.email }))

  const summary = occurrenceData?.summary || {
    totalScheduled: 0,
    conducted: 0,
    inProgress: 0,
    missed: 0,
    upcoming: 0,
    complianceRate: 0,
    averageTurnout: 0
  }

  const allLessons = occurrenceData?.lessons || []
  const filteredLessons = allLessons.filter(l => {
    const matchesStatus = statusFilter === 'All' ? true : l.occurrenceStatus === statusFilter
    const q = searchFilter.toLowerCase()
    const matchesSearch = !q ? true : (
      l.courseCode?.toLowerCase().includes(q) ||
      l.courseName?.toLowerCase().includes(q) ||
      l.lecturerName?.toLowerCase().includes(q) ||
      l.roomName?.toLowerCase().includes(q)
    )
    return matchesStatus && matchesSearch
  })

  return (
    <div className="scope-adminattendancereports admin-layout">
      <AdminSidebar />
      <main className="admin-content" style={{ background: '#0b1120', padding: '2rem', color: '#f1f5f9', minHeight: '100vh' }}>
        
        {/* Header */}
        <header style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#f8fafc' }}>
                Attendance &amp; Lesson Occurrence Tracking
              </h1>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
                Audit scheduled lessons against actual lecture occurrences and monitor timetable compliance
              </p>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('occurrence')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeTab === 'occurrence' ? '#2563eb' : 'transparent',
                  color: activeTab === 'occurrence' ? '#ffffff' : '#94a3b8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <Clock size={15} /> Timetable Occurrence
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('historical')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeTab === 'historical' ? '#2563eb' : 'transparent',
                  color: activeTab === 'historical' ? '#ffffff' : '#94a3b8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <Activity size={15} /> Past Sessions &amp; Spatial Heatmaps
              </button>
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: TIMETABLE OCCURRENCE & LESSON COMPLIANCE TRACKER
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'occurrence' && (
          <div>
            {/* Top KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Total Scheduled
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc' }}>
                  {summary.totalScheduled}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Lectures on {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long' })}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ color: '#4ade80', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Conducted / Held
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#4ade80' }}>
                  {summary.conducted}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Sessions confirmed with attendance
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ color: '#f87171', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Missed / Unheld
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f87171' }}>
                  {summary.missed}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Slot passed without session start
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(96, 165, 250, 0.2)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ color: '#60a5fa', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  In Progress / Active
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#60a5fa' }}>
                  {summary.inProgress}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Live lectures streaming right now
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Timetable Compliance
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: summary.complianceRate >= 80 ? '#4ade80' : summary.complianceRate >= 60 ? '#facc15' : '#f87171' }}>
                  {summary.complianceRate}%
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Scheduled execution rate
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Avg Student Turnout
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#38bdf8' }}>
                  {summary.averageTurnout}%
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Across conducted classes
                </div>
              </div>

            </div>

            {/* Date Navigator & Controls */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '1rem 1.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              {/* Date Shifter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => shiftDate(-1)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f8fafc',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Previous Day"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDateChange(new Date().toISOString().split('T')[0])}
                  style={{
                    background: selectedDate === new Date().toISOString().split('T')[0] ? '#2563eb' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => shiftDate(1)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f8fafc',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Next Day"
                >
                  <ChevronRight size={16} />
                </button>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  style={{
                    background: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />

                <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500, marginLeft: '6px' }}>
                  {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Status Filter Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {['All', 'Conducted', 'In Progress', 'Missed', 'Upcoming'].map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    style={{
                      background: statusFilter === st ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                      border: statusFilter === st ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                      color: statusFilter === st ? '#93c5fd' : '#94a3b8',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    {st}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => loadOccurrenceTracking(selectedDate)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: '8px'
                  }}
                  title="Reload"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {occurrenceError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '1.5rem' }}>
                {occurrenceError}
              </div>
            )}

            {/* Occurrence Table */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
              {loadingOccurrence ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  Loading timetable occurrence records...
                </div>
              ) : filteredLessons.length === 0 ? (
                <div style={{ padding: '3.5rem', textAlign: 'center' }}>
                  <Calendar size={36} style={{ color: '#64748b', marginBottom: '1rem' }} />
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#cbd5e1' }}>No Scheduled Lessons</h3>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
                    There are no timetable schedules matching your criteria on this day.
                  </p>
                </div>
              ) : (
                <div className="table-container" style={{ margin: 0 }}>
                  <table className="admin-table" style={{ background: 'transparent', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Time Slot</th>
                        <th style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Course &amp; Title</th>
                        <th style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Venue</th>
                        <th style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Lecturer</th>
                        <th style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Occurrence Status</th>
                        <th style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Student Turnout</th>
                        <th style={{ color: '#94a3b8', fontSize: '0.78rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLessons.map((l, idx) => {
                        const statusColors = {
                          'Conducted': { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80', border: 'rgba(74, 222, 128, 0.3)' },
                          'In Progress': { bg: 'rgba(96, 165, 250, 0.15)', text: '#60a5fa', border: 'rgba(96, 165, 250, 0.3)' },
                          'Missed': { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171', border: 'rgba(248, 113, 113, 0.3)' },
                          'Due Now': { bg: 'rgba(250, 204, 21, 0.15)', text: '#facc15', border: 'rgba(250, 204, 21, 0.3)' },
                          'Upcoming': { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' }
                        }
                        const stStyle = statusColors[l.occurrenceStatus] || statusColors['Upcoming']

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {/* Time */}
                            <td>
                              <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.875rem' }}>
                                {String(l.scheduledStart).substring(0, 5)} &ndash; {String(l.scheduledEnd).substring(0, 5)}
                              </div>
                              {l.actualStart && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                  Started: {new Date(l.actualStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </td>

                            {/* Course */}
                            <td>
                              <div style={{ fontWeight: 700, color: '#60a5fa' }}>{l.courseCode}</div>
                              <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{l.courseName}</div>
                            </td>

                            {/* Venue */}
                            <td>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f8fafc' }}>
                                <MapPin size={13} style={{ color: '#94a3b8' }} /> {l.roomName}
                              </div>
                              {l.building && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{l.building}</div>}
                            </td>

                            {/* Lecturer */}
                            <td>
                              <div style={{ fontWeight: 500, color: '#f8fafc' }}>{l.lecturerName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{l.lecturerEmail || '-'}</div>
                            </td>

                            {/* Status */}
                            <td>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: stStyle.bg,
                                color: stStyle.text,
                                border: `1px solid ${stStyle.border}`,
                                padding: '3px 10px',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                {l.occurrenceStatus === 'Conducted' && <CheckCircle2 size={12} />}
                                {l.occurrenceStatus === 'In Progress' && (
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#60a5fa', animation: 'pulse 1.5s infinite' }} />
                                )}
                                {l.occurrenceStatus === 'Missed' && <AlertCircle size={12} />}
                                {l.occurrenceStatus}
                              </span>
                            </td>

                            {/* Turnout */}
                            <td>
                              {l.occurrenceStatus === 'Conducted' || l.occurrenceStatus === 'In Progress' ? (
                                <div style={{ minWidth: '110px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                                    <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{l.attendedCount} / {l.registeredCount || '—'}</span>
                                    <span style={{ color: '#94a3b8' }}>{l.turnoutRate}%</span>
                                  </div>
                                  <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                      width: `${Math.min(100, l.turnoutRate)}%`,
                                      height: '100%',
                                      background: l.turnoutRate >= 75 ? '#4ade80' : l.turnoutRate >= 50 ? '#facc15' : '#f87171'
                                    }} />
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                  {l.registeredCount} enrolled
                                </span>
                              )}
                            </td>

                            {/* Action */}
                            <td style={{ textAlign: 'right' }}>
                              {l.sessionId ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleViewSession({
                                      id: l.sessionId,
                                      course_code: l.courseCode,
                                      course_name: l.courseName,
                                      end_time: l.actualEnd || l.actualStart || new Date().toISOString()
                                    })
                                    setActiveTab('historical')
                                  }}
                                  style={{
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    color: '#93c5fd',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  View Roll Call
                                </button>
                              ) : (
                                <span style={{ color: '#475569', fontSize: '0.75rem' }}>No session</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: HISTORICAL SESSIONS & SPATIAL HEATMAPS
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'historical' && (
          <div>
            {sessionsError && <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{sessionsError}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: selectedSession ? '1fr 1fr' : '1fr', gap: '2rem', alignItems: 'start' }}>
              
              {/* Left: Session List */}
              <div className="table-container" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>Historical Sessions Log</h3>
                  <button onClick={loadSessions} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <RefreshCw size={14} />
                  </button>
                </div>

                {loadingSessions ? <p style={{ padding: '2rem', textAlign: 'center' }}>Loading historical records...</p> : (
                  <table className="admin-table" style={{ background: 'transparent' }}>
                    <thead>
                      <tr>
                        <th style={{ color: '#94a3b8' }}>Date</th>
                        <th style={{ color: '#94a3b8' }}>Course</th>
                        <th style={{ color: '#94a3b8' }}>Room</th>
                        <th style={{ color: '#94a3b8' }}>Present</th>
                        <th style={{ color: '#94a3b8' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(s => (
                        <tr 
                          key={s.id} 
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: selectedSession?.id === s.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                          }}
                        >
                          <td>{new Date(s.end_time || s.start_time || s.date).toLocaleDateString()}</td>
                          <td>
                            <strong style={{ color: '#60a5fa' }}>{s.course_code}</strong>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s.course_name}</div>
                          </td>
                          <td>{s.room_name}</td>
                          <td>
                            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 600 }}>
                              {s.present_count}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="button button-primary" 
                              style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
                              onClick={() => handleViewSession(s)}
                            >
                              View Roster
                            </button>
                          </td>
                        </tr>
                      ))}
                      {sessions.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No historical sessions found.</td></tr>}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Right: Selected Session Details (Roster + Spatial Heatmap) */}
              {selectedSession && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.2rem 0', color: '#60a5fa' }}>{selectedSession.course_code}</h3>
                      <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        {selectedSession.course_name} &bull; {new Date(selectedSession.end_time || selectedSession.start_time || new Date()).toLocaleString()}
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedSession(null)} 
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {loadingRecords ? <p style={{ color: '#94a3b8' }}>Loading verified attendance roster...</p> : (
                    <>
                      {/* Heatmap */}
                      {mapData.length > 0 && (
                        <div style={{ height: '300px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '1.5rem', padding: '1rem' }}>
                          <h4 style={{ margin: '0 0 1rem 0', color: '#cbd5e1', fontSize: '0.85rem' }}>Spatial Trilateration Heatmap</h4>
                          <ResponsiveContainer width="100%" height="90%">
                            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                              <XAxis type="number" dataKey="x" hide domain={['dataMin - 1', 'dataMax + 1']} />
                              <YAxis type="number" dataKey="y" reversed hide domain={[0, 'dataMax + 1']} />
                              <Tooltip 
                                cursor={{ strokeDasharray: '3 3' }}
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                                formatter={(val, name, props) => [props.payload.name, 'Student']}
                              />
                              <ReferenceDot x={0} y={0} r={6} fill="#ef4444" stroke="none" />
                              <Scatter data={mapData} fill="#3b82f6" />
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* List */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                        <h4 style={{ margin: 0, color: '#cbd5e1', fontSize: '0.9rem' }}>
                          Verified Students Present ({records.length})
                        </h4>
                      </div>

                      <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                        {records.map((r, i) => (
                          <div 
                            key={i} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '0.75rem', 
                              background: 'rgba(255,255,255,0.02)', 
                              borderRadius: '8px', 
                              marginBottom: '0.5rem',
                              border: '1px solid rgba(255,255,255,0.04)'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                                {r.student_name || r.username || 'Student'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {r.student_number ? `No: ${r.student_number} • ` : ''}{r.email}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ 
                                fontSize: '0.72rem', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '4px', 
                                background: r.verification_type?.includes('BLE') ? 'rgba(59,130,246,0.2)' : 'rgba(16, 185, 129, 0.2)', 
                                color: r.verification_type?.includes('BLE') ? '#93c5fd' : '#4ade80' 
                              }}>
                                {String(r.verification_type || 'Verified').replace('_', ' ')}
                              </span>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                                {r.scan_time ? new Date(r.scan_time).toLocaleTimeString() : 'Recorded'}
                              </div>
                            </div>
                          </div>
                        ))}
                        {records.length === 0 && (
                          <p style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>No student attendance records for this session.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
