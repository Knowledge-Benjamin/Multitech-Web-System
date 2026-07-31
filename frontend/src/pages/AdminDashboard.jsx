import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import './AdminDashboard.css'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentApps, setRecentApps] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const admin = JSON.parse(localStorage.getItem('adminUser') || '{}')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/auth/dashboard/stats')

      if (response.data.success) {
        setStats(response.data.stats)
        setRecentApps(response.data.recentApplications)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    navigate('/admin/login')
  }

  if (loading) {
    return <div className="admin-container"><p>Loading...</p></div>
  }

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>ADMIN</h2>
          <p>{admin.username}</p>
        </div>

        <nav className="sidebar-nav">
          <Link to="/admin/dashboard" className="nav-item active">
            📊 Dashboard
          </Link>
          <Link to="/admin/programmes" className="nav-item">
            📚 Programmes
          </Link>
          <Link to="/admin/applications" className="nav-item">
            📋 Applications
          </Link>
          <Link to="/admin/announcements" className="nav-item">
            📢 Announcements
          </Link>
          <Link to="/admin/articles" className="nav-item">
            📝 Articles & Posts
          </Link>
          {admin.role === 'superadmin' && (
            <Link to="/admin/settings" className="nav-item">
              ⚙️ Settings
            </Link>
          )}
        </nav>

        <button onClick={handleLogout} className="btn-logout">
          🚪 Logout
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Dashboard</h1>
          <p>Welcome back, {admin.username}!</p>
        </header>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h3>Programmes</h3>
              <p className="stat-number">{stats?.programmes || 0}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <h3>Applications</h3>
              <p className="stat-number">{stats?.applications || 0}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📢</div>
            <div className="stat-content">
              <h3>Announcements</h3>
              <p className="stat-number">{stats?.announcements || 0}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>Admin Users</h3>
              <p className="stat-number">{stats?.admins || 0}</p>
            </div>
          </div>
        </div>

        <section className="recent-section">
          <h2>Recent Applications</h2>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Programme</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentApps.length > 0 ? (
                  recentApps.map((app) => (
                    <tr key={app.id}>
                      <td>{app.first_name} {app.last_name}</td>
                      <td>{app.email}</td>
                      <td>Programme {app.programme_id}</td>
                      <td>
                        <span className={`status-badge status-${app.status}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>{new Date(app.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center">No applications yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Link to="/admin/applications" className="btn-view-all">
            View All Applications →
          </Link>
        </section>
      </main>
    </div>
  )
}
