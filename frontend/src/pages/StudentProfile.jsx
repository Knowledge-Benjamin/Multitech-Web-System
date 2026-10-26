import { useApiQuery } from '../hooks/useApiQuery'
import StudentSidebar from '../components/StudentSidebar'
import { User, GraduationCap, Mail, Phone, Calendar, ShieldCheck } from 'lucide-react'
import './AdminDashboard.css'

export default function StudentProfile() {
  const token = localStorage.getItem('studentToken')
  const { data: resData, isLoading } = useApiQuery(`${import.meta.env.VITE_API_URL}/student-profile`, 'studentProfileDetails', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const data = resData?.data
  const profile = data?.profile

  return (
    <div className="scope-studentprofile scope-admindashboard admin-layout">
      <StudentSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)' }}>
        <header className="content-header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-secondary)', margin: '0 0 0.25rem 0' }}>Official Student Profile</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Verified bio-data, academic registration, and contact information</p>
        </header>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading profile information...</p>
          </div>
        ) : profile ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.75rem' }}>
            
            {/* Personal Bio Details */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '1.75rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                <div className="stat-icon-wrapper bg-blue" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
                  <User size={20} className="text-blue" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-secondary)' }}>Personal Details</h3>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>First Name</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>{profile.first_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Last Name</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>{profile.last_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Gender</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{profile.gender || 'Not specified'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Date of Birth</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>
                    {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not specified'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Contact Phone</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{profile.phone || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Institutional Email</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{profile.email}</span>
                </div>
              </div>
            </div>

            {/* Academic Registration */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '1.75rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                <div className="stat-icon-wrapper bg-indigo" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
                  <GraduationCap size={20} className="text-indigo" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-secondary)' }}>Academic Records</h3>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Student Number</span>
                  <strong style={{ fontFamily: 'monospace', letterSpacing: '0.5px', color: 'var(--color-primary)' }}>
                    {profile.student_number}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Enrolled Programme</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)', textAlign: 'right', maxWidth: '60%' }}>
                    {profile.programme_name}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Student Standing</span>
                  <span className="status-pill status-admitted" style={{ textTransform: 'capitalize' }}>
                    {profile.current_status || 'Active'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>System Authorization</span>
                  <span className="trend positive">
                    <ShieldCheck size={14} /> Verified Student Record
                  </span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <p style={{ color: 'var(--color-text-secondary)' }}>Profile information could not be retrieved.</p>
        )}
      </main>
    </div>
  )
}
