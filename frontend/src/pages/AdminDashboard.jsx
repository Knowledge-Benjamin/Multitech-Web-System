import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ClipboardList, Megaphone, Users, ArrowRight, RefreshCw } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import api from '../services/api'
import AdminSidebar from '../components/AdminSidebar'
import './AdminDashboard.css'

const STATUS_COLORS = {
  pending: '#a47a35',
  submitted: '#4778b8',
  under_review: '#8b6a36',
  reviewing: '#8b6a36',
  accepted: '#34785b',
  offered: '#426d9e',
  admitted: '#286b50',
  rejected: '#a85151'
}

const formatStatus = (status) => (status || 'pending')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())

const formatMonth = (month) => {
  const date = new Date(`${month}-01T12:00:00`)
  return Number.isNaN(date.getTime())
    ? month
    : new Intl.DateTimeFormat('en', { month: 'short' }).format(date)
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentApps, setRecentApps] = useState([])
  const [applicationStats, setApplicationStats] = useState([])
  const [applicationTrend, setApplicationTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')
  const admin = JSON.parse(localStorage.getItem('adminUser') || '{}')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setDashboardError('')
    try {
      const response = await api.get('/auth/dashboard/stats')
      const data = response.data
      if (
        !data?.success ||
        !data.stats ||
        !Array.isArray(data.recentApplications) ||
        !Array.isArray(data.applicationStats) ||
        !Array.isArray(data.applicationTrend)
      ) {
        throw new Error(data?.message || 'Dashboard response was incomplete.')
      }

      setStats(data.stats)
      setRecentApps(data.recentApplications)
      setApplicationStats(data.applicationStats)
      setApplicationTrend(data.applicationTrend)
    } catch (error) {
      console.error('Error fetching stats:', error)
      setDashboardError('Dashboard data could not be loaded. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const statusChartData = applicationStats
    .map(({ status, count }) => {
      const key = (status || 'pending').toLowerCase()
      return {
        name: formatStatus(key),
        value: Number(count),
        color: STATUS_COLORS[key] || '#8793a5'
      }
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
  const applicationTotal = statusChartData.reduce((total, item) => total + item.value, 0)
  const hasApplicationTrend = applicationTrend.some((item) => Number(item.count) > 0)

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

  if (dashboardError) {
    return (
      <div className="scope-admindashboard admin-layout">
        <AdminSidebar />
        <main className="admin-content">
          <section className="dashboard-error" role="alert">
            <h1>Dashboard unavailable</h1>
            <p>{dashboardError}</p>
            <button type="button" className="dashboard-retry-button" onClick={fetchStats}>
              <RefreshCw size={16} />
              Try again
            </button>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="scope-admindashboard admin-layout">
      <AdminSidebar />

      <main className="admin-content">
        <header className="dashboard-hero fade-in-item">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot"></span>
              Administration
            </div>
            <h1>Welcome back, {admin.username || 'Administrator'}</h1>
            <p>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              &nbsp;&bull;&nbsp;A clear view of admissions and operations.
            </p>
          </div>
          <div className="hero-decoration"></div>
        </header>

        <div className="stats-grid fade-in-section is-visible">
          <Link to="/admin/programmes" className="stat-card fade-in-item">
            <div className="stat-icon-wrapper bg-blue">
              <BookOpen size={24} className="text-blue" />
            </div>
            <div className="stat-content">
              <h3>Programmes</h3>
              <div className="stat-value-row">
                <p className="stat-number">{stats?.programmes || 0}</p>
                <span className="stat-caption">In catalogue</span>
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
                <span className="stat-caption">Received</span>
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
                <span className="stat-caption">Published</span>
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
                <span className="stat-caption">Accounts</span>
              </div>
            </div>
          </div>
        </div>

        <section className="dashboard-analytics" aria-label="Application analytics">
          <article className="analytics-card activity-card">
            <div className="analytics-heading">
              <div>
                <p className="analytics-eyebrow">Admissions</p>
                <h2>Application activity</h2>
              </div>
              <span className="analytics-period">Last 12 months</span>
            </div>
            {hasApplicationTrend ? (
              <div className="activity-chart" role="img" aria-label="Monthly application activity for the last 12 months">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={applicationTrend} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="applicationActivityFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2b63a8" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#2b63a8" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#edf0f5" strokeDasharray="3 4" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonth}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#8290a4', fontSize: 12 }}
                      minTickGap={18}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#8290a4', fontSize: 12 }}
                      width={42}
                    />
                    <Tooltip
                      labelFormatter={(month) => {
                        const date = new Date(`${month}-01T12:00:00`)
                        return Number.isNaN(date.getTime())
                          ? month
                          : new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)
                      }}
                      formatter={(value) => [value, 'Applications']}
                      contentStyle={{ border: '1px solid #e4e9f1', borderRadius: 10, boxShadow: '0 8px 24px rgba(27, 41, 66, 0.1)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#2b63a8"
                      strokeWidth={2.5}
                      fill="url(#applicationActivityFill)"
                      activeDot={{ r: 5, strokeWidth: 0, fill: '#2b63a8' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="analytics-empty">No application activity in the last 12 months.</div>
            )}
          </article>

          <article className="analytics-card status-card">
            <div className="analytics-heading">
              <div>
                <p className="analytics-eyebrow">Application pipeline</p>
                <h2>By status</h2>
              </div>
            </div>
            {applicationTotal > 0 ? (
              <div className="status-chart-layout">
                <div className="status-donut" role="img" aria-label="Application totals by status">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={66}
                        outerRadius={88}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {statusChartData.map((item) => <Cell key={item.name} fill={item.color} />)}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [value, name]}
                        contentStyle={{ border: '1px solid #e4e9f1', borderRadius: 10, boxShadow: '0 8px 24px rgba(27, 41, 66, 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-total" aria-hidden="true">
                    <strong>{applicationTotal.toLocaleString()}</strong>
                    <span>Applications</span>
                  </div>
                </div>
                <ul className="status-legend">
                  {statusChartData.map((item) => (
                    <li key={item.name}>
                      <span className="legend-name">
                        <i style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <strong>{item.value.toLocaleString()}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="analytics-empty">Status data will appear when applications are received.</div>
            )}
          </article>
        </section>

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
                  <th>Applicant</th>
                  <th>Programme</th>
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
                          <div className="avatar" aria-hidden="true">
                            {app.first_name?.charAt(0) || ''}{app.last_name?.charAt(0) || ''}
                          </div>
                          <div>
                            <strong>{app.first_name} {app.last_name}</strong>
                            <span className="email">{app.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="programme-name">{app.programme_name || 'Not selected'}</span>
                      </td>
                      <td>
                        <div className="date-cell">
                          {new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill status-${(app.status || 'pending').toLowerCase()}`}>
                          {formatStatus(app.status)}
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
