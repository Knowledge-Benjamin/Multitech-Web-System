import { useState } from 'react'
import axios from 'axios'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Copy, 
  Sparkles, 
  LayoutGrid, 
  List, 
  AlertTriangle, 
  Check, 
  RefreshCw, 
  X, 
  Layers,
  Building
} from 'lucide-react'
import './AdminDashboard.css'

const API = import.meta.env.VITE_API_URL
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AdminTimetable() {
  const token = localStorage.getItem('adminToken')
  const headers = { Authorization: `Bearer ${token}` }
  const axiosOptions = { headers }

  // Queries using useApiQuery
  const { data: schedulesData, isLoading: loadingSchedules, refetch: refetchSchedules } = useApiQuery('/timetable/schedules', 'adminSchedules', { axiosOptions })
  const { data: roomsData, isLoading: loadingRooms, refetch: refetchRooms } = useApiQuery('/timetable/rooms', 'adminRooms', { axiosOptions })
  const { data: coursesData, isLoading: loadingCourses } = useApiQuery('/timetable/courses', 'adminCourses', { axiosOptions })
  const { data: lecturersData, isLoading: loadingLecturers } = useApiQuery('/timetable/lecturers', 'adminLecturers', { axiosOptions })
  const { data: termsData, isLoading: loadingTerms } = useApiQuery('/timetable/terms', 'adminTerms', { axiosOptions })

  const schedules = schedulesData?.schedules || []
  const rooms = roomsData?.rooms || []
  const courses = coursesData?.courses || []
  const lecturers = lecturersData?.lecturers || []
  const terms = termsData?.terms || []

  const loading = loadingSchedules || loadingRooms || loadingCourses || loadingLecturers || loadingTerms

  // Tab & View States
  const [activeTab, setActiveTab] = useState('schedules') // schedules | rooms
  const [viewMode, setViewMode] = useState('table') // table | grid
  const [filterDay, setFilterDay] = useState('All')
  const [filterTerm, setFilterTerm] = useState('All')

  // Forms
  const [schedForm, setSchedForm] = useState({
    courseId: '', roomId: '', lecturerId: '', academicTermId: '',
    dayOfWeek: 'Monday', startTime: '09:00', endTime: '11:00'
  })
  const [roomForm, setRoomForm] = useState({ name: '', capacity: '', type: 'Classroom', building: '' })

  // Edit Schedule Modal State
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [editSchedForm, setEditSchedForm] = useState({
    courseId: '', roomId: '', lecturerId: '', academicTermId: '',
    dayOfWeek: 'Monday', startTime: '', endTime: '', allowConflictOverride: false
  })

  // Edit Room Modal State
  const [editingRoom, setEditingRoom] = useState(null)
  const [editRoomForm, setEditRoomForm] = useState({ name: '', capacity: '', type: 'Classroom', building: '', status: 'active' })

  // Auto-Generate Modal State
  const [showAutoModal, setShowAutoModal] = useState(false)
  const [autoForm, setAutoForm] = useState({
    academicTermId: '',
    preferredDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    slotDurationHours: 2,
    startHour: 8,
    endHour: 17,
    clearExisting: false
  })
  const [generating, setGenerating] = useState(false)

  // Status & Feedback
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const notify = (msg, isError = false) => {
    if (isError) { setError(msg); setSuccess('') }
    else { setSuccess(msg); setError('') }
    setTimeout(() => { setError(''); setSuccess('') }, 4000)
  }

  // --- Handlers: Schedules ---

  const handleCreateSchedule = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await axios.post(`${API}/timetable/schedules`, schedForm, { headers })
      notify('Class schedule created successfully!')
      setSchedForm({ 
        courseId: '', roomId: '', lecturerId: '', academicTermId: schedForm.academicTermId, 
        dayOfWeek: 'Monday', startTime: '09:00', endTime: '11:00' 
      })
      refetchSchedules()
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to create schedule.', true)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenEditSchedule = (s) => {
    setEditingSchedule(s)
    setEditSchedForm({
      courseId: s.course_id,
      roomId: s.room_id,
      lecturerId: s.lecturer_id,
      academicTermId: s.term_id,
      dayOfWeek: s.day_of_week,
      startTime: s.start_time?.substring(0, 5) || '',
      endTime: s.end_time?.substring(0, 5) || '',
      allowConflictOverride: false
    })
  }

  const handleUpdateSchedule = async (e) => {
    e.preventDefault()
    if (!editingSchedule) return
    setSaving(true)
    try {
      await axios.put(`${API}/timetable/schedules/${editingSchedule.id}`, editSchedForm, { headers })
      notify('Class schedule updated successfully!')
      setEditingSchedule(null)
      refetchSchedules()
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to update schedule.', true)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this class schedule?')) return
    try {
      await axios.delete(`${API}/timetable/schedules/${id}`, { headers })
      notify('Schedule deleted.')
      refetchSchedules()
    } catch { 
      notify('Failed to delete schedule.', true) 
    }
  }

  const handleDuplicateSchedule = (s) => {
    setSchedForm({
      courseId: s.course_id,
      roomId: s.room_id,
      lecturerId: s.lecturer_id,
      academicTermId: s.term_id,
      dayOfWeek: s.day_of_week,
      startTime: s.start_time?.substring(0, 5) || '09:00',
      endTime: s.end_time?.substring(0, 5) || '11:00'
    })
    notify(`Copied ${s.course_code} parameters into schedule creation form.`)
  }

  const handleClearTermSchedules = async () => {
    if (filterTerm === 'All') {
      alert('Please select a specific Academic Term in the filter dropdown to clear its schedules.')
      return
    }
    const termObj = terms.find(t => String(t.id) === String(filterTerm))
    const confirmMsg = `Are you sure you want to delete ALL schedules for ${termObj?.name || 'this term'}? This cannot be undone.`
    if (!window.confirm(confirmMsg)) return

    try {
      const res = await axios.delete(`${API}/timetable/schedules/term/${filterTerm}`, { headers })
      notify(res.data.message || 'Term schedules cleared.')
      refetchSchedules()
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to clear term schedules.', true)
    }
  }

  // --- Handlers: Auto-Generation ---

  const handleAutoGenerate = async (e) => {
    e.preventDefault()
    if (!autoForm.academicTermId) {
      alert('Please select an Academic Term.')
      return
    }
    setGenerating(true)
    try {
      const res = await axios.post(`${API}/timetable/auto-generate`, autoForm, { headers })
      notify(res.data.message || 'Timetable generated automatically!')
      setShowAutoModal(false)
      refetchSchedules()
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to generate timetable.', true)
    } finally {
      setGenerating(false)
    }
  }

  // --- Handlers: Rooms ---

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await axios.post(`${API}/timetable/rooms`, roomForm, { headers })
      notify('Room created successfully!')
      setRoomForm({ name: '', capacity: '', type: 'Classroom', building: '' })
      refetchRooms()
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to create room.', true)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenEditRoom = (r) => {
    setEditingRoom(r)
    setEditRoomForm({
      name: r.name,
      capacity: r.capacity,
      type: r.type || 'Classroom',
      building: r.building || '',
      status: r.status || 'active'
    })
  }

  const handleUpdateRoom = async (e) => {
    e.preventDefault()
    if (!editingRoom) return
    setSaving(true)
    try {
      await axios.put(`${API}/timetable/rooms/${editingRoom.id}`, editRoomForm, { headers })
      notify('Room updated successfully!')
      setEditingRoom(null)
      refetchRooms()
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to update room.', true)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Deactivate this room?')) return
    try {
      await axios.delete(`${API}/timetable/rooms/${id}`, { headers })
      notify('Room deactivated.')
      refetchRooms()
    } catch { 
      notify('Failed to deactivate room.', true) 
    }
  }

  const formatTime = (t) => t ? t.substring(0, 5) : '-'

  // Filtered schedules
  const filteredSchedules = schedules.filter(s => {
    const matchesDay = filterDay === 'All' ? true : s.day_of_week === filterDay
    const matchesTerm = filterTerm === 'All' ? true : String(s.term_id) === String(filterTerm)
    return matchesDay && matchesTerm
  })

  return (
    <div className="scope-admintimetable admin-layout fade-in-section is-visible">
      <AdminSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)', padding: '2rem' }}>
        
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
              Timetable Management
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Full control over academic schedules, room facilities, time slots, and conflict-free automated scheduling
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setAutoForm({ ...autoForm, academicTermId: terms[0]?.id || '' })
                setShowAutoModal(true)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)'
              }}
            >
              <Sparkles size={16} /> ⚡ Auto-Generate Timetable
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>{success}</div>}

        {/* Tab & View Mode Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Main tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('schedules')}
              className={`button ${activeTab === 'schedules' ? 'button-primary' : 'button-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.875rem' }}
            >
              Class Schedules ({schedules.length})
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`button ${activeTab === 'rooms' ? 'button-primary' : 'button-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.875rem' }}
            >
              Rooms &amp; Venues ({rooms.length})
            </button>
          </div>

          {/* If on schedules tab: View switcher and term filter */}
          {activeTab === 'schedules' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                value={filterTerm}
                onChange={e => setFilterTerm(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                <option value="All">All Academic Terms</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              {filterTerm !== 'All' && (
                <button
                  type="button"
                  onClick={handleClearTermSchedules}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    background: '#fff1f2',
                    color: '#dc2626',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                  title="Clear all schedules for this term"
                >
                  Clear Term Draft
                </button>
              )}

              {/* View Mode Toggle */}
              <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '2px' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: viewMode === 'table' ? 'white' : 'transparent',
                    color: viewMode === 'table' ? '#1e293b' : '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <List size={14} /> Table View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: viewMode === 'grid' ? 'white' : 'transparent',
                    color: viewMode === 'grid' ? '#1e293b' : '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <LayoutGrid size={14} /> Weekly Grid
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading-state" style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner"></div>
            <p>Loading timetable records...</p>
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════════════
                CLASS SCHEDULES TAB
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'schedules' && (
              <div>
                {/* Day selector pills (for table view) */}
                {viewMode === 'table' && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    {['All', ...DAYS].map(d => (
                      <button
                        key={d}
                        onClick={() => setFilterDay(d)}
                        className={`button ${filterDay === d ? 'button-primary' : 'button-secondary'}`}
                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', borderRadius: '20px' }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'table' ? '1fr 360px' : '1fr', gap: '2rem', alignItems: 'start' }}>
                  
                  {/* --- Table View --- */}
                  {viewMode === 'table' && (
                    <div className="table-container" style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <table className="modern-table">
                        <thead>
                          <tr>
                            <th>Day &amp; Time</th>
                            <th>Course</th>
                            <th>Lecturer</th>
                            <th>Room / Building</th>
                            <th>Term</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSchedules.map(s => (
                            <tr key={s.id}>
                              <td>
                                <div style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>{s.day_of_week}</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#64748b' }}>
                                  {formatTime(s.start_time)} &ndash; {formatTime(s.end_time)}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{s.course_code}</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.course_name}</div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 500 }}>{s.lecturer_name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.lecturer_email}</div>
                              </td>
                              <td>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={13} style={{ color: '#64748b' }} /> {s.room_name}
                                </div>
                                {s.building && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.building}</div>}
                              </td>
                              <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{s.term_name}</td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSchedule(s)}
                                    style={{
                                      background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155',
                                      padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', gap: '3px'
                                    }}
                                    title="Edit schedule slot"
                                  >
                                    <Edit2 size={12} /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateSchedule(s)}
                                    style={{
                                      background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155',
                                      padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer'
                                    }}
                                    title="Duplicate parameters to add form"
                                  >
                                    <Copy size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSchedule(s.id)}
                                    style={{
                                      background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c',
                                      padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer'
                                    }}
                                    title="Delete schedule"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredSchedules.length === 0 && (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                                No class schedules found for the selected filter.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* --- Weekly Matrix Grid View --- */}
                  {viewMode === 'grid' && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '1.25rem',
                      alignItems: 'start'
                    }}>
                      {DAYS.map(day => {
                        const daySchedules = filteredSchedules
                          .filter(s => s.day_of_week === day)
                          .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))

                        return (
                          <div 
                            key={day}
                            style={{
                              background: 'white',
                              borderRadius: '12px',
                              border: '1px solid rgba(0,0,0,0.06)',
                              overflow: 'hidden',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                          >
                            <div style={{
                              padding: '12px 16px',
                              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                              borderBottom: '1px solid #e2e8f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-secondary)', fontWeight: 700 }}>
                                {day}
                              </h3>
                              <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', color: '#475569', fontWeight: 600 }}>
                                {daySchedules.length}
                              </span>
                            </div>

                            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {daySchedules.map(slot => (
                                <div 
                                  key={slot.id}
                                  style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    background: '#fafafa',
                                    transition: 'all 0.2s',
                                    position: 'relative'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                    <span style={{
                                      fontFamily: 'monospace',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      color: '#2563eb',
                                      background: 'rgba(37, 99, 235, 0.08)',
                                      padding: '2px 6px',
                                      borderRadius: '4px'
                                    }}>
                                      {formatTime(slot.start_time)} &ndash; {formatTime(slot.end_time)}
                                    </span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditSchedule(slot)}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                        title="Edit slot"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSchedule(slot.id)}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                        title="Delete slot"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>

                                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                                    {slot.course_code}
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px' }}>
                                    {slot.course_name}
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#475569', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <MapPin size={11} /> {slot.room_name}
                                    </span>
                                    <span>{slot.lecturer_name}</span>
                                  </div>
                                </div>
                              ))}

                              {daySchedules.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                                  No classes scheduled on {day}
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSchedForm({ ...schedForm, dayOfWeek: day })
                                  setViewMode('table')
                                }}
                                style={{
                                  border: '1px dashed #cbd5e1',
                                  background: 'transparent',
                                  color: '#64748b',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Plus size={13} /> Add {day} Class
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Create Schedule Form (Sidebar on Table View) */}
                  {viewMode === 'table' && (
                    <div className="card" style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid var(--color-border)', position: 'sticky', top: '1rem' }}>
                      <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Plus size={16} /> Add Class Schedule
                      </h3>
                      <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div>
                          <label className="form-label">Course</label>
                          <select className="form-select" value={schedForm.courseId} onChange={e => setSchedForm({...schedForm, courseId: e.target.value})} required>
                            <option value="">Select course</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} &mdash; {c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Lecturer</label>
                          <select className="form-select" value={schedForm.lecturerId} onChange={e => setSchedForm({...schedForm, lecturerId: e.target.value})} required>
                            <option value="">Select lecturer</option>
                            {lecturers.map(l => <option key={l.id} value={l.id}>{l.username} ({l.email})</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Room</label>
                          <select className="form-select" value={schedForm.roomId} onChange={e => setSchedForm({...schedForm, roomId: e.target.value})} required>
                            <option value="">Select room</option>
                            {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity}){r.building ? ` &mdash; ${r.building}` : ''}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Academic Term</label>
                          <select className="form-select" value={schedForm.academicTermId} onChange={e => setSchedForm({...schedForm, academicTermId: e.target.value})} required>
                            <option value="">Select term</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Day of Week</label>
                          <select className="form-select" value={schedForm.dayOfWeek} onChange={e => setSchedForm({...schedForm, dayOfWeek: e.target.value})} required>
                            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label className="form-label">Start Time</label>
                            <input type="time" className="form-input" value={schedForm.startTime} onChange={e => setSchedForm({...schedForm, startTime: e.target.value})} required />
                          </div>
                          <div>
                            <label className="form-label">End Time</label>
                            <input type="time" className="form-input" value={schedForm.endTime} onChange={e => setSchedForm({...schedForm, endTime: e.target.value})} required />
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          className="button button-primary" 
                          disabled={saving}
                          style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
                        >
                          {saving ? 'Saving...' : 'Add Schedule Slot'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                ROOMS & VENUES TAB
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'rooms' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
                <div className="table-container" style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Room Name</th>
                        <th>Type</th>
                        <th>Capacity</th>
                        <th>Building / Location</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.name}</strong></td>
                          <td>{r.type}</td>
                          <td>{r.capacity} seats</td>
                          <td>{r.building || 'Main Campus'}</td>
                          <td>
                            <span className={`status-pill ${r.status === 'active' ? 'status-admitted' : 'status-rejected'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditRoom(r)}
                                style={{
                                  background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155',
                                  padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer'
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRoom(r.id)}
                                style={{
                                  background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c',
                                  padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer'
                                }}
                              >
                                Deactivate
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {rooms.length === 0 && (
                        <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No rooms configured.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Create Room Form */}
                <div className="card" style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                  <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building size={16} /> Add Room / Venue
                  </h3>
                  <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <label className="form-label">Room Name / Code</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Lab 3, Hall B" 
                        value={roomForm.name} 
                        onChange={e => setRoomForm({...roomForm, name: e.target.value})} 
                        required 
                      />
                    </div>
                    <div>
                      <label className="form-label">Capacity (seats)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        placeholder="e.g. 60" 
                        value={roomForm.capacity} 
                        onChange={e => setRoomForm({...roomForm, capacity: e.target.value})} 
                        required 
                      />
                    </div>
                    <div>
                      <label className="form-label">Venue Type</label>
                      <select 
                        className="form-select" 
                        value={roomForm.type} 
                        onChange={e => setRoomForm({...roomForm, type: e.target.value})}
                      >
                        <option value="Classroom">Classroom</option>
                        <option value="Computer Lab">Computer Lab</option>
                        <option value="Lecture Hall">Lecture Hall</option>
                        <option value="Auditorium">Auditorium</option>
                        <option value="Workshop">Workshop</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Building / Campus Block</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Main Block Level 2" 
                        value={roomForm.building} 
                        onChange={e => setRoomForm({...roomForm, building: e.target.value})} 
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="button button-primary" 
                      disabled={saving}
                      style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
                    >
                      {saving ? 'Saving...' : 'Add Room'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODAL 1: EDIT SCHEDULE (COMPLETE FLEXIBILITY)
        ══════════════════════════════════════════════════════════════════════ */}
        {editingSchedule && (
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
          }}>
            <div style={{
              background: 'white', borderRadius: '16px', maxWidth: '520px', width: '100%',
              padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-secondary)' }}>
                  Edit Class Schedule Slot
                </h3>
                <button 
                  onClick={() => setEditingSchedule(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label className="form-label">Course</label>
                  <select 
                    className="form-select" 
                    value={editSchedForm.courseId} 
                    onChange={e => setEditSchedForm({ ...editSchedForm, courseId: e.target.value })} 
                    required
                  >
                    {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} &mdash; {c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Assigned Lecturer</label>
                  <select 
                    className="form-select" 
                    value={editSchedForm.lecturerId} 
                    onChange={e => setEditSchedForm({ ...editSchedForm, lecturerId: e.target.value })} 
                    required
                  >
                    {lecturers.map(l => <option key={l.id} value={l.id}>{l.username} ({l.email})</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Room / Venue</label>
                  <select 
                    className="form-select" 
                    value={editSchedForm.roomId} 
                    onChange={e => setEditSchedForm({ ...editSchedForm, roomId: e.target.value })} 
                    required
                  >
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity}){r.building ? ` &mdash; ${r.building}` : ''}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label">Academic Term</label>
                    <select 
                      className="form-select" 
                      value={editSchedForm.academicTermId} 
                      onChange={e => setEditSchedForm({ ...editSchedForm, academicTermId: e.target.value })} 
                      required
                    >
                      {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Day of Week</label>
                    <select 
                      className="form-select" 
                      value={editSchedForm.dayOfWeek} 
                      onChange={e => setEditSchedForm({ ...editSchedForm, dayOfWeek: e.target.value })} 
                      required
                    >
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label">Start Time</label>
                    <input 
                      type="time" 
                      className="form-input" 
                      value={editSchedForm.startTime} 
                      onChange={e => setEditSchedForm({ ...editSchedForm, startTime: e.target.value })} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label">End Time</label>
                    <input 
                      type="time" 
                      className="form-input" 
                      value={editSchedForm.endTime} 
                      onChange={e => setEditSchedForm({ ...editSchedForm, endTime: e.target.value })} 
                      required 
                    />
                  </div>
                </div>

                {/* Conflict Override Option */}
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#475569', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={editSchedForm.allowConflictOverride}
                      onChange={e => setEditSchedForm({ ...editSchedForm, allowConflictOverride: e.target.checked })}
                    />
                    <span>Allow conflict override (admin force assignment)</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setEditingSchedule(null)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="button button-primary"
                    disabled={saving}
                  >
                    {saving ? 'Updating...' : 'Save Schedule Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODAL 2: AUTO-GENERATE TIMETABLE (DRAFT CREATOR)
        ══════════════════════════════════════════════════════════════════════ */}
        {showAutoModal && (
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
          }}>
            <div style={{
              background: 'white', borderRadius: '16px', maxWidth: '520px', width: '100%',
              padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ background: '#dbeafe', color: '#2563eb', padding: '6px', borderRadius: '8px' }}>
                    <Sparkles size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-secondary)' }}>
                    Auto-Generate Timetable Draft
                  </h3>
                </div>
                <button 
                  onClick={() => setShowAutoModal(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                The automated scheduler assigns courses to active rooms and lecturers across standard time blocks, guaranteeing zero room clashes and zero lecturer double-bookings. You can edit any slot manually afterwards.
              </p>

              <form onSubmit={handleAutoGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Academic Term to Schedule</label>
                  <select 
                    className="form-select" 
                    value={autoForm.academicTermId} 
                    onChange={e => setAutoForm({ ...autoForm, academicTermId: e.target.value })}
                    required
                  >
                    <option value="">Select academic term</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label">Daily Window Start</label>
                    <select 
                      className="form-select" 
                      value={autoForm.startHour}
                      onChange={e => setAutoForm({ ...autoForm, startHour: Number(e.target.value) })}
                    >
                      <option value={8}>08:00 AM</option>
                      <option value={9}>09:00 AM</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Daily Window End</label>
                    <select 
                      className="form-select" 
                      value={autoForm.endHour}
                      onChange={e => setAutoForm({ ...autoForm, endHour: Number(e.target.value) })}
                    >
                      <option value={17}>05:00 PM</option>
                      <option value={18}>06:00 PM</option>
                      <option value={19}>07:00 PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Slot Duration</label>
                  <select 
                    className="form-select" 
                    value={autoForm.slotDurationHours}
                    onChange={e => setAutoForm({ ...autoForm, slotDurationHours: Number(e.target.value) })}
                  >
                    <option value={2}>2 Hours per lecture session (Standard)</option>
                    <option value={3}>3 Hours per lecture session (Extended)</option>
                  </select>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#475569', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={autoForm.clearExisting}
                      onChange={e => setAutoForm({ ...autoForm, clearExisting: e.target.checked })}
                    />
                    <span>Clear any existing schedules for this term first (fresh generation)</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowAutoModal(false)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="button button-primary"
                    disabled={generating}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Sparkles size={15} /> {generating ? 'Generating Schedule...' : 'Generate Timetable'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODAL 3: EDIT ROOM MODAL
        ══════════════════════════════════════════════════════════════════════ */}
        {editingRoom && (
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
          }}>
            <div style={{
              background: 'white', borderRadius: '16px', maxWidth: '440px', width: '100%',
              padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-secondary)' }}>
                  Edit Room Venue Details
                </h3>
                <button 
                  onClick={() => setEditingRoom(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label className="form-label">Room Name / Code</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editRoomForm.name} 
                    onChange={e => setEditRoomForm({ ...editRoomForm, name: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="form-label">Capacity (seats)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editRoomForm.capacity} 
                    onChange={e => setEditRoomForm({ ...editRoomForm, capacity: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="form-label">Venue Type</label>
                  <select 
                    className="form-select" 
                    value={editRoomForm.type} 
                    onChange={e => setEditRoomForm({ ...editRoomForm, type: e.target.value })}
                  >
                    <option value="Classroom">Classroom</option>
                    <option value="Computer Lab">Computer Lab</option>
                    <option value="Lecture Hall">Lecture Hall</option>
                    <option value="Auditorium">Auditorium</option>
                    <option value="Workshop">Workshop</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Building / Location</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editRoomForm.building} 
                    onChange={e => setEditRoomForm({ ...editRoomForm, building: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select 
                    className="form-select" 
                    value={editRoomForm.status} 
                    onChange={e => setEditRoomForm({ ...editRoomForm, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setEditingRoom(null)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="button button-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Update Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
