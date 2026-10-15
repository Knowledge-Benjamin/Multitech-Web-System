import StudentSidebar from '../components/StudentSidebar'
import { useApiQuery } from '../hooks/useApiQuery'

const API = import.meta.env.VITE_API_URL

export default function StudentAnnouncements() {
  const token = localStorage.getItem('studentToken')
  const { data, isLoading, error } = useApiQuery(`${API}/student-profile/announcements`, 'studentAnnouncements', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })
  const announcements = data?.data || []

  return (
    <div className="scope-studentannouncements admin-layout">
      <StudentSidebar />
      <main className="admin-content student-dashboard-main">
        <div style={{ padding: '24px' }}>
          <header style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.8rem', color: '#1e1b4b', marginBottom: '8px' }}>Announcements</h2>
            <p style={{ color: '#6b7280' }}>Important updates from your lecturers for enrolled courses.</p>
          </header>

          {error && <div className="message-error">Failed to load announcements.</div>}

          {isLoading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <div className="announcements-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {announcements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>📭</span>
                  <h3 style={{ color: '#1e1b4b', marginBottom: '8px' }}>No Announcements</h3>
                  <p style={{ color: '#6b7280' }}>Your lecturers have not posted any announcements for your current courses.</p>
                </div>
              ) : (
                announcements.map(ann => (
                  <div key={ann.id} style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <span style={{ display: 'inline-block', padding: '4px 8px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>
                          {ann.course_code}: {ann.course_name}
                        </span>
                        <h3 style={{ fontSize: '1.2rem', color: '#1e1b4b', margin: 0 }}>{ann.title}</h3>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#64748b' }}>
                        <div style={{ fontWeight: 500, color: '#334155' }}>{ann.lecturer_name}</div>
                        <div>{new Date(ann.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div style={{ color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {ann.body}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
