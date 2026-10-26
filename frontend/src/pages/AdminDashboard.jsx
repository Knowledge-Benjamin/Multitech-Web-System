import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ClipboardList, Megaphone, Users, ArrowRight, TrendingUp } from 'lucide-react'
import api from '../services/api'
import AdminSidebar from '../components/AdminSidebar'
import './AdminDashboard.css'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentApps, setRecentApps] = useState([])
  const [loading, setLoading] = useState(true)
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

  if (loading) {
    return (
      <div className="scope-admindashboard admin-layout">
        <AdminSidebar />
        <main className="admin-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your dashboard...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="scope-admindashboard admin-layout">
      <AdminSidebar />

      <main className="admin-content">
        {/* Animated Hero Section */}
        <header className="dashboard-hero fade-in-item">
          <div className="hero-content">
            <h1>Welcome back, {admin.username}!</h1>
            <p>Here's what's happening with the university today.</p>
          </div>
          <div className="hero-decoration"></div>
        </header>

        {/* Clickable Stats Grid */}
        <div className="stats-grid fade-in-section is-visible">
          <Link to="/admin/programmes" className="stat-card fade-in-item">
            <div className="stat-icon-wrapper bg-blue">
              <BookOpen size={24} className="text-blue" />
            </div>
            <div className="stat-content">
              <h3>Programmes</h3>
              <div className="stat-value-row">
                <p className="stat-number">{stats?.programmes || 0}</p>
                <span className="trend positive"><TrendingUp size={14}/> Active</span>
              </div>
            </div>
          </Link>

          <Link to="/admin/applications" className="stat-card fade-in-item">
            <div className="stat-icon-wrapper bg-indigo">
              <ClipboardList size={24} className="text-indigo" />
            </div>
            <div className="stat-content">
              <h3>Applications</h3>
              <div className="stat-value-row">
                <p className="stat-number">{stats?.applications || 0}</p>
                <span className="trend positive"><TrendingUp size={14}/> New</span>
              </div>
            </div>
          </Link>

          <Link to="/admin/announcements" className="stat-card fade-in-item">
            <div className="stat-icon-wrapper bg-amber">
              <Megaphone size={24} className="text-amber" />
            </div>
            <div className="stat-content">
              <h3>Announcements</h3>
              <div className="stat-value-row">
                <p className="stat-number">{stats?.announcements || 0}</p>
                <span className="trend neutral">Published</span>
              </div>
            </div>
          </Link>

          <div className="stat-card fade-in-item">
            <div className="stat-icon-wrapper bg-emerald">
              <Users size={24} className="text-emerald" />
            </div>
            <div className="stat-content">
              <h3>Admin Users</h3>
              <div className="stat-value-row">
                <p className="stat-number">{stats?.admins || 0}</p>
                <span className="trend neutral">System</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Applications Modern Table */}
        <section className="recent-section fade-in-section is-visible">
          <div className="section-header fade-in-item">
            <h2>Recent Applications</h2>
            <Link to="/admin/applications" className="btn-text">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          
          <div className="table-container fade-in-item">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Applicant Details</th>
                  <th>Programme ID</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentApps.length > 0 ? (
                  recentApps.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <div className="applicant-info">
                          <div className="avatar">{app.first_name.charAt(0)}{app.last_name.charAt(0)}</div>
                          <div>
                            <strong>{app.first_name} {app.last_name}</strong>
                            <span className="email">{app.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="programme-tag">PROG-{app.programme_id}</span>
                      </td>
                      <td>
                        <div className="date-cell">
                          {new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          <span className="time">{new Date(app.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill status-${app.status}`}>
                          {app.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      <div className="empty-content">
                        <ClipboardList size={32} />
                        <p>No recent applications found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
