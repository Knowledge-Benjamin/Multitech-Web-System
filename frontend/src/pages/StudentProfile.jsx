import { useState, useEffect } from 'react'
import axios from 'axios'
import StudentSidebar from '../components/StudentSidebar'

export default function StudentProfile() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const token = localStorage.getItem('studentToken')
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/student-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setData(res.data.data)
    } catch (error) {
      console.error('Error fetching profile', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-layout">
      <StudentSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)' }}>
        <header className="content-header">
          <h1>My Profile</h1>
        </header>

        {loading ? <p>Loading profile...</p> : (
          <div className="profile-container" style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
            <div className="dashboard-card" style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
              <h3>Personal Details</h3>
              {data && data.profile && (
                <div style={{ marginTop: '1rem', lineHeight: '1.8' }}>
                  <p><strong>Name:</strong> {data.profile.first_name} {data.profile.last_name}</p>
                  <p><strong>Gender:</strong> {data.profile.gender}</p>
                  <p><strong>Date of Birth:</strong> {data.profile.date_of_birth}</p>
                  <p><strong>Phone:</strong> {data.profile.phone}</p>
                  <p><strong>Email:</strong> {data.profile.email}</p>
                </div>
              )}
            </div>

            <div className="dashboard-card" style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
              <h3>Academic Registration</h3>
              {data && data.profile && (
                <div style={{ marginTop: '1rem', lineHeight: '1.8' }}>
                  <p><strong>Student Number:</strong> {data.profile.student_number}</p>
                  <p><strong>Programme:</strong> {data.profile.programme_name}</p>
                  <p><strong>Current Status:</strong> <span className="badge badge-success">{data.profile.current_status}</span></p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
