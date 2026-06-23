import { useState, useEffect } from 'react'
import axios from 'axios'
import StudentSidebar from '../components/StudentSidebar'

export default function StudentDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    const token = localStorage.getItem('studentToken')
    const user = JSON.parse(localStorage.getItem('studentUser'))
    
    try {
      // Assuming we create an endpoint to fetch my profile
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/student-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setData(res.data.data)
    } catch (error) {
      console.error('Error fetching dashboard', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-layout">
      <StudentSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)' }}>
        <header className="content-header">
          <h1>Welcome, {JSON.parse(localStorage.getItem('studentUser'))?.name}</h1>
        </header>

        {loading ? <p>Loading dashboard...</p> : (
          <div className="dashboard-grid">
            
            {/* Academic Status Widget */}
            <div className="dashboard-card" style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
              <h3>Current Academic Status</h3>
              {data && data.currentEnrollment ? (
                <div style={{ marginTop: '1rem' }}>
                  <p><strong>Academic Year:</strong> {data.currentEnrollment.year_name}</p>
                  <p><strong>Semester:</strong> {data.currentEnrollment.term_name}</p>
                  <p><strong>Progression:</strong> Year {data.currentEnrollment.study_year} - Sem {data.currentEnrollment.study_semester}</p>
                  <p><strong>Status:</strong> <span className="badge badge-primary">{data.currentEnrollment.progression_status}</span></p>
                </div>
              ) : (
                <p className="text-muted mt-2">No active enrollment for the current term.</p>
              )}
            </div>

            {/* Financial Summary Widget */}
            <div className="dashboard-card" style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
              <h3>Financial Overview</h3>
              {data && data.financials ? (
                <div style={{ marginTop: '1rem' }}>
                  <h1 style={{ color: 'var(--color-primary)', fontSize: '2.5rem', margin: '0.5rem 0' }}>
                    {data.financials.currency} {Number(data.financials.totalDue).toLocaleString()}
                  </h1>
                  <p className="text-muted">Total Outstanding Balance</p>
                </div>
              ) : (
                <p className="text-muted mt-2">Loading financials...</p>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
