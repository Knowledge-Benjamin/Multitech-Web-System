import StudentSidebar from '../components/StudentSidebar'
import { useApiQuery } from '../hooks/useApiQuery'
import { Clock, MapPin, User, Calendar, Inbox } from 'lucide-react'
import './AdminDashboard.css'

const API = import.meta.env.VITE_API_URL

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

export default function StudentTimetable() {
  const token = localStorage.getItem('studentToken')
  const { data: resData, isLoading, error: apiError } = useApiQuery(`${API}/student-profile/timetable`, 'studentTimetable', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const schedules = resData?.data || []
  const error = apiError ? 'Failed to load class schedule.' : ''

  // Group schedules by day of week
  const grouped = DAYS.reduce((acc, day) => {
    acc[day] = schedules.filter(s => s.day_of_week === day)
    return acc
  }, {})

  return (
    <div className="scope-studenttimetable scope-admindashboard admin-layout">
      <StudentSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)' }}>
        <header className="content-header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-secondary)', margin: '0 0 0.25rem 0' }}>Class Timetable</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Weekly lecture schedule, rooms, and assigned faculty</p>
        </header>

        {error && <div className="message-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your class schedule...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="empty-state" style={{ padding: '3.5rem', background: 'white', borderRadius: '16px', textAlign: 'center' }}>
            <Inbox size={40} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-secondary)' }}>No Scheduled Classes</h3>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>There are no scheduled lectures found for your registered courses this semester.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {DAYS.map(day => {
              const dayClasses = grouped[day]
              if (dayClasses.length === 0) return null

              return (
                <div key={day} style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                  <div style={{ background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: 'var(--color-secondary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} className="text-blue" />
                    <span>{day}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginLeft: 'auto' }}>
                      {dayClasses.length} {dayClasses.length === 1 ? 'Session' : 'Sessions'}
                    </span>
                  </div>
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {dayClasses.map(cls => (
                      <div key={cls.id} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ width: '150px', flexShrink: 0, fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                          <Clock size={15} />
                          {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px', fontSize: '0.95rem' }}>
                            <span style={{ fontFamily: 'monospace', color: 'var(--color-primary)', marginRight: '8px' }}>{cls.course_code}</span>
                            {cls.course_name}
                          </div>
                          <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <MapPin size={14} /> Room {cls.room_name} {cls.building ? `(${cls.building})` : ''}
                            </span>
                            {cls.lecturer_name && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <User size={14} /> {cls.lecturer_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
