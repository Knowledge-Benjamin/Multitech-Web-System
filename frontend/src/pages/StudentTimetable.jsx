import { useApiQuery } from '../hooks/useApiQuery'
import StudentSidebar from '../components/StudentSidebar'

const API = import.meta.env.VITE_API_URL

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const date = new Date()
  date.setHours(parseInt(h, 10))
  date.setMinutes(parseInt(m, 10))
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function StudentTimetable() {
  const token = localStorage.getItem('studentToken')
  const { data: resData, isLoading, error: apiError } = useApiQuery(`${API}/student-profile/timetable`, {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const schedules = resData?.data || []
  const error = apiError ? 'Failed to load your timetable.' : ''

  // Group schedules by day of week
  const grouped = DAYS.reduce((acc, day) => {
    acc[day] = schedules.filter(s => s.day_of_week === day)
    return acc
  }, {})

  return (
    <div className="admin-layout">
      <StudentSidebar />
      <main className="admin-content student-dashboard-main">
        <div className="timetable-container" style={{ padding: '24px' }}>
          <header style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.8rem', color: '#1e1b4b', marginBottom: '8px' }}>My Class Timetable</h2>
            <p style={{ color: '#6b7280' }}>Your weekly schedule based on your registered courses.</p>
          </header>

          {error && <div className="message-error">{error}</div>}

          {isLoading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : schedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>📅</span>
              <h3 style={{ color: '#1e1b4b', marginBottom: '8px' }}>No Classes Scheduled</h3>
              <p style={{ color: '#6b7280' }}>You do not have any classes scheduled for your registered courses this term.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {DAYS.map(day => {
                const dayClasses = grouped[day]
                if (dayClasses.length === 0) return null

                return (
                  <div key={day} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#334155', fontSize: '1.1rem' }}>
                      {day}
                    </div>
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {dayClasses.map(cls => (
                        <div key={cls.id} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                          <div style={{ width: '140px', flexShrink: 0, fontWeight: 600, color: '#6366f1' }}>
                            {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                              {cls.course_code} — {cls.course_name}
                            </div>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#64748b' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                📍 {cls.room_name} {cls.building ? `(${cls.building})` : ''}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                👨‍🏫 {cls.lecturer_name}
                              </span>
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
        </div>
      </main>
    </div>
  )
}
