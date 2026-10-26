import StudentSidebar from '../components/StudentSidebar'
import { useApiQuery } from '../hooks/useApiQuery'
import { Megaphone, User, Calendar, Inbox } from 'lucide-react'
import './AdminDashboard.css'

const API = import.meta.env.VITE_API_URL

export default function StudentAnnouncements() {
  const token = localStorage.getItem('studentToken')
  const { data, isLoading, error } = useApiQuery(`${API}/student-profile/announcements`, 'studentAnnouncements', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })
  const announcements = data?.data || []

  return (
    <div className="scope-studentannouncements scope-admindashboard admin-layout">
      <StudentSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)' }}>
        <header className="content-header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-secondary)', margin: '0 0 0.25rem 0' }}>Academic Announcements</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Notices and coursework updates published by your course lecturers</p>
        </header>

        {error && <div className="message-error" style={{ marginBottom: '1.5rem' }}>Failed to load course announcements.</div>}

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading announcements...</p>
          </div>
        ) : (
          <div className="recent-section">
            {announcements.length === 0 ? (
              <div className="empty-state" style={{ padding: '3.5rem', background: 'white', borderRadius: '16px', textAlign: 'center' }}>
                <Inbox size={40} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-secondary)' }}>No Announcements Published</h3>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>No new announcements have been issued for your registered courses.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {announcements.map(ann => (
                  <div key={ann.id} style={{ background: 'white', padding: '1.75rem', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <span className="programme-tag" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>
                          {ann.course_code}: {ann.course_name}
                        </span>
                        <h3 style={{ fontSize: '1.2rem', color: 'var(--color-secondary)', margin: 0 }}>{ann.title}</h3>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                          <User size={14} /> {ann.lecturer_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', justifyContent: 'flex-end' }}>
                          <Calendar size={13} /> {new Date(ann.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}>
                      {ann.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
