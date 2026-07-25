import { useState, useEffect } from 'react'
import axios from 'axios'
import LecturerSidebar from '../components/LecturerSidebar'
import './LecturerDashboard.css'

const API = import.meta.env.VITE_API_URL

export default function LecturerTimetable() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  useEffect(() => {
    fetchTimetable()
  }, [])

  const fetchTimetable = async () => {
    try {
      const info = localStorage.getItem('lecturerInfo')
      if (!info) throw new Error('Lecturer info not found')
      const lecturer = JSON.parse(info)
      
      const token = localStorage.getItem('lecturerToken')
      const res = await axios.get(`${API}/timetable/schedules?lecturerId=${lecturer.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSchedules(res.data.schedules || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }

  // Group schedules by day
  const groupedSchedules = daysOfWeek.reduce((acc, day) => {
    acc[day] = schedules.filter(s => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
    return acc
  }, {})

  const formatTime = (timeStr) => {
    const [h, m] = timeStr.split(':')
    const date = new Date()
    date.setHours(h, m)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="lecturer-layout">
      <LecturerSidebar />
      <main className="lecturer-main">
        <header className="lecturer-topbar">
          <div>
            <h1>My Timetable</h1>
            <p className="term-badge">📅 Your scheduled classes across all courses.</p>
          </div>
        </header>

        {loading ? (
          <div className="lecturer-loading">
            <div className="spinner-ring"></div>
            <p>Loading your timetable...</p>
          </div>
        ) : error ? (
          <div className="lecturer-empty">
            <span>❌</span>
            <h2>Error</h2>
            <p>{error}</p>
          </div>
        ) : (
          <div className="timetable-grid" style={{ marginTop: '20px' }}>
            {daysOfWeek.map(day => {
              const daySchedules = groupedSchedules[day]
              if (daySchedules.length === 0) return null

              return (
                <div key={day} style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ color: '#1e1b4b', marginBottom: '16px', borderBottom: '2px solid #eef2ff', paddingBottom: '10px' }}>{day}</h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {daySchedules.map(s => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#6366f1', marginBottom: '4px' }}>{formatTime(s.start_time)} - {formatTime(s.end_time)}</div>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.course_code} - {s.course_name}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-block', background: '#eef2ff', color: '#4f46e5', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                            📍 {s.room_name} ({s.building})
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>Term: {s.term_name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            
            {schedules.length === 0 && (
              <div className="lecturer-empty">
                <span>📅</span>
                <h2>No Classes Scheduled</h2>
                <p>You do not have any classes scheduled for this term.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
