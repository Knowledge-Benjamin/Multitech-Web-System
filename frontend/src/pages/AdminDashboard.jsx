import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ClipboardList, Megaphone, Users, ArrowRight, RefreshCw } from 'lucide-react'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
  pending: '#c19a4b',
  submitted: '#3977c4',
  under_review: '#b4873d',
  reviewing: '#7c8ca2',
  accepted: '#498065',
  offered: '#6079a8',
  admitted: '#2d6d50',
  rejected: '#a85454'
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
  const applicationTrendTotal = applicationTrend.reduce((total, item) => total + Number(item.count), 0)
  const statusChartWithPercentages = statusChartData.map((item) => ({
    ...item,
    percentage: applicationTotal ? Math.round((item.value / applicationTotal) * 100) : 0
  }))
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
        <header className="dashboard-intro">
          <div className="dashboard-intro-copy">
            <p className="dashboard-eyebrow">Multitech <span>Administration</span></p>
            <h1>Welcome back, <em>{admin.username || 'Administrator'}</em></h1>
            <p className="dashboard-subtitle">Admissions and operations, in one view.</p>
          </div>
          <div className="dashboard-date">
            <span>Today</span>
            <strong>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
          </div>
        </header>

        <div className="stats-grid fade-in-section is-visible">
          <Link to="/admin/programmes" className="stat-card fade-in-item">
            <div className="stat-card-heading">
              <h3>Programmes</h3>
              <span className="stat-icon-wrapper"><BookOpen size={20} strokeWidth={1.6} /></span>
            </div>
            <div className="stat-value-row">
              <p className="stat-number">{stats?.programmes || 0}</p>
              <span className="stat-caption">In catalogue</span>
            </div>
            <span className="stat-card-rule" />
          </Link>

          <Link to="/admin/applications" className="stat-card fade-in-item">
            <div className="stat-card-heading">
              <h3>Applications</h3>
              <span className="stat-icon-wrapper"><ClipboardList size={20} strokeWidth={1.6} /></span>
            </div>
            <div className="stat-value-row">
              <p className="stat-number">{stats?.applications || 0}</p>
              <span className="stat-caption">Received</span>
            </div>
            <span className="stat-card-rule" />
          </Link>

          <Link to="/admin/announcements" className="stat-card fade-in-item">
            <div className="stat-card-heading">
              <h3>Announcements</h3>
              <span className="stat-icon-wrapper"><Megaphone size={20} strokeWidth={1.6} /></span>
            </div>
            <div className="stat-value-row">
              <p className="stat-number">{stats?.announcements || 0}</p>
              <span className="stat-caption">Published</span>
            </div>
            <span className="stat-card-rule" />
          </Link>

          <article className="stat-card fade-in-item">
            <div className="stat-card-heading">
              <h3>Admin users</h3>
              <span className="stat-icon-wrapper"><Users size={20} strokeWidth={1.6} /></span>
            </div>
            <div className="stat-value-row">
              <p className="stat-number">{stats?.admins || 0}</p>
              <span className="stat-caption">Accounts</span>
            </div>
            <span className="stat-card-rule" />
          </article>
        </div>

        <section className="dashboard-analytics" aria-label="Application analytics">
          <article className="analytics-card activity-card">
            <div className="analytics-heading">
              <div>
                <p className="analytics-eyebrow">Admissions <span>— Monthly view</span></p>
                <h2>Application activity</h2>
              </div>
              <div className="analytics-total">
                <strong>{applicationTrendTotal.toLocaleString()}</strong>
                <span>past 12 months</span>
              </div>
            </div>
            {hasApplicationTrend ? (
              <div className="activity-chart" role="img" aria-label="Monthly application activity for the last 12 months">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={applicationTrend} margin={{ top: 18, right: 18, left: -12, bottom: 2 }}>
                    <CartesianGrid vertical={false} stroke="#e9e5dc" strokeDasharray="2 6" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonth}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#718096', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
                      minTickGap={16}
                    />
                    <YAxis
                      allowDecimals={false}
                      domain={[0, 'dataMax']}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#718096', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
                      width={38}
                    />
                    <Tooltip
                      labelFormatter={(month) => {
                        const date = new Date(`${month}-01T12:00:00`)
                        return Number.isNaN(date.getTime())
                          ? month
                          : new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)
                      }}
                      formatter={(value) => [value, 'Applications']}
                      contentStyle={{ border: '1px solid #e6e1d7', borderRadius: 12, boxShadow: '0 12px 32px rgba(16, 43, 78, 0.12)', fontFamily: 'Inter, sans-serif', fontSize: 13 }}
                      labelStyle={{ marginBottom: 4, color: '#102b4e', fontWeight: 600 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#0052cc"
                      strokeWidth={2.8}
                      dot={{ r: 3.5, strokeWidth: 2, stroke: '#fff', fill: '#0052cc' }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: '#0052cc' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="analytics-empty">No application activity in the last 12 months.</div>
            )}
          </article>

          <article className="analytics-card status-card">
            <div className="analytics-heading">
              <div>
                <p className="analytics-eyebrow">Application pipeline <span>— Current mix</span></p>
                <h2>Applications by status</h2>
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
                        outerRadius={87}
                        paddingAngle={statusChartData.length > 1 ? 3 : 0}
                        stroke="none"
                      >
                        {statusChartWithPercentages.map((item) => <Cell key={item.name} fill={item.color} />)}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [value, name]}
                        contentStyle={{ border: '1px solid #e6e1d7', borderRadius: 12, boxShadow: '0 12px 32px rgba(16, 43, 78, 0.12)', fontFamily: 'Inter, sans-serif', fontSize: 13 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-total" aria-hidden="true">
                    <strong>{applicationTotal.toLocaleString()}</strong>
                    <span>{statusChartData.length === 1 ? statusChartData[0].name : 'Applications'}</span>
                  </div>
                </div>
                <ul className="status-legend">
                  {statusChartWithPercentages.map((item) => (
                    <li key={item.name}>
                      <span className="legend-name">
                        <i style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <strong>{item.value.toLocaleString()}</strong>
                      <span className="legend-percent">{item.percentage}%</span>
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
            <div>
              <p className="analytics-eyebrow">Admissions</p>
              <h2>Recent applications</h2>
            </div>
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
