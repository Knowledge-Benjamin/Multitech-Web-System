import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'

const API = import.meta.env.VITE_API_URL
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AdminTimetable() {
  const token = localStorage.getItem('adminToken')
  const headers = { Authorization: `Bearer ${token}` }

  // Lists
  const [schedules, setSchedules] = useState([])
  const [rooms, setRooms] = useState([])
  const [courses, setCourses] = useState([])
  const [lecturers, setLecturers] = useState([])
  const [terms, setTerms] = useState([])

  // Schedule form
  const [schedForm, setSchedForm] = useState({
    courseId: '', roomId: '', lecturerId: '', academicTermId: '',
    dayOfWeek: 'Monday', startTime: '', endTime: ''
  })
  // Room form
  const [roomForm, setRoomForm] = useState({ name: '', capacity: '', type: 'Classroom', building: '' })

  const [activeTab, setActiveTab] = useState('schedules') // schedules | rooms
  const [filterDay, setFilterDay] = useState('All')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [s, r, c, l, t] = await Promise.all([
        axios.get(`${API}/timetable/schedules`, { headers }),
        axios.get(`${API}/timetable/rooms`, { headers }),
        axios.get(`${API}/timetable/courses`, { headers }),
        axios.get(`${API}/timetable/lecturers`, { headers }),
        axios.get(`${API}/timetable/terms`, { headers }),
      ])
      setSchedules(s.data.schedules || [])
      setRooms(r.data.rooms || [])
      setCourses(c.data.courses || [])
      setLecturers(l.data.lecturers || [])
      setTerms(t.data.terms || [])
    } catch (e) {
      setError('Failed to load timetable data.')
    } finally {
      setLoading(false)
    }
  }

  const notify = (msg, isError = false) => {
    if (isError) { setError(msg); setSuccess('') }
    else { setSuccess(msg); setError('') }
    setTimeout(() => { setError(''); setSuccess('') }, 4000)
  }

  const handleCreateSchedule = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await axios.post(`${API}/timetable/schedules`, schedForm, { headers })
      notify('Class schedule created successfully!')
      setSchedForm({ courseId: '', roomId: '', lecturerId: '', academicTermId: '', dayOfWeek: 'Monday', startTime: '', endTime: '' })
      await loadAll()
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to create schedule.', true)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this class schedule?')) return
    try {
      await axios.delete(`${API}/timetable/schedules/${id}`, { headers })
      notify('Schedule deleted.')
      await loadAll()
    } catch { notify('Failed to delete schedule.', true) }
  }

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await axios.post(`${API}/timetable/rooms`, roomForm, { headers })
      notify('Room created successfully!')
      setRoomForm({ name: '', capacity: '', type: 'Classroom', building: '' })
      await loadAll()
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to create room.', true)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Deactivate this room?')) return
    try {
      await axios.delete(`${API}/timetable/rooms/${id}`, { headers })
      notify('Room deactivated.')
      await loadAll()
    } catch { notify('Failed to deactivate room.', true) }
  }

  const formatTime = (t) => t ? t.substring(0, 5) : '-'

  const filteredSchedules = filterDay === 'All'
    ? schedules
    : schedules.filter(s => s.day_of_week === filterDay)

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>📅 Timetable Management</h1>
            <p style={{ margin: '0.3rem 0 0 0', color: '#64748b' }}>
              Configure rooms and assign class schedules for each academic term.
            </p>
          </div>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {['schedules', 'rooms'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`button ${activeTab === tab ? 'button-primary' : 'button-secondary'}`}
            >
              {tab === 'schedules' ? '📋 Class Schedules' : '🏫 Rooms'}
            </button>
          ))}
        </div>

        {loading ? <p>Loading...</p> : (
          <>
            {/* ── CLASS SCHEDULES TAB ──────────────────────────────────────── */}
            {activeTab === 'schedules' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}>

                {/* Table */}
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {['All', ...DAYS].map(d => (
                      <button
                        key={d}
                        onClick={() => setFilterDay(d)}
                        className={`button ${filterDay === d ? 'button-primary' : 'button-secondary'}`}
                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>

                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Time</th>
                          <th>Course</th>
                          <th>Lecturer</th>
                          <th>Room</th>
                          <th>Term</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSchedules.map(s => (
                          <tr key={s.id}>
                            <td><strong>{s.day_of_week}</strong></td>
                            <td style={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                              {formatTime(s.start_time)} – {formatTime(s.end_time)}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>{s.course_code}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.course_name}</div>
                            </td>
                            <td>
                              <div>{s.lecturer_name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.lecturer_email}</div>
                            </td>
                            <td>
                              <div>{s.room_name}</div>
                              {s.building && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.building}</div>}
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>{s.term_name}</td>
                            <td>
                              <button
                                onClick={() => handleDeleteSchedule(s.id)}
                                className="button button-danger"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredSchedules.length === 0 && (
                          <tr><td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                            No schedules for {filterDay === 'All' ? 'any day' : filterDay}.
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Create Schedule Form */}
                <div className="card" style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid var(--color-border)', position: 'sticky', top: '1rem' }}>
                  <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem' }}>➕ Add Class Schedule</h3>
                  <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <label className="form-label">Course</label>
                      <select className="form-select" value={schedForm.courseId} onChange={e => setSchedForm({...schedForm, courseId: e.target.value})} required>
                        <option value="">Select course</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} — {c.name}</option>)}
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
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity}){r.building ? ` — ${r.building}` : ''}</option>)}
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
                    <button type="submit" className="button button-primary" disabled={saving} style={{ marginTop: '0.5rem' }}>
                      {saving ? 'Saving...' : 'Create Schedule'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── ROOMS TAB ────────────────────────────────────────────────── */}
            {activeTab === 'rooms' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Room Name</th>
                        <th>Type</th>
                        <th>Building</th>
                        <th>Capacity</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.name}</strong></td>
                          <td>{r.type}</td>
                          <td>{r.building || '—'}</td>
                          <td>{r.capacity}</td>
                          <td>
                            <button
                              onClick={() => handleDeleteRoom(r.id)}
                              className="button button-danger"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                            >
                              Deactivate
                            </button>
                          </td>
                        </tr>
                      ))}
                      {rooms.length === 0 && (
                        <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                          No rooms created yet.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Create Room Form */}
                <div className="card" style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid var(--color-border)', position: 'sticky', top: '1rem' }}>
                  <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem' }}>➕ Add Room</h3>
                  <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <label className="form-label">Room Name</label>
                      <input type="text" className="form-input" placeholder="e.g. Lecture Room 3" value={roomForm.name} onChange={e => setRoomForm({...roomForm, name: e.target.value})} required />
                    </div>
                    <div>
                      <label className="form-label">Type</label>
                      <select className="form-select" value={roomForm.type} onChange={e => setRoomForm({...roomForm, type: e.target.value})}>
                        {['Classroom', 'Lab', 'Auditorium', 'Seminar Room'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Building</label>
                      <input type="text" className="form-input" placeholder="e.g. Block A" value={roomForm.building} onChange={e => setRoomForm({...roomForm, building: e.target.value})} />
                    </div>
                    <div>
                      <label className="form-label">Capacity (seats)</label>
                      <input type="number" className="form-input" placeholder="e.g. 60" value={roomForm.capacity} onChange={e => setRoomForm({...roomForm, capacity: e.target.value})} required min="1" />
                    </div>
                    <button type="submit" className="button button-primary" disabled={saving} style={{ marginTop: '0.5rem' }}>
                      {saving ? 'Saving...' : 'Create Room'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
