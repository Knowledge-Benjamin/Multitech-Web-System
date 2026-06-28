import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import './AdminSidebar.css'

export default function AdminSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const admin = JSON.parse(localStorage.getItem('adminUser') || '{}')
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true'
  })

  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed')
      localStorage.setItem('sidebarCollapsed', 'true')
    } else {
      document.body.classList.remove('sidebar-collapsed')
      localStorage.setItem('sidebarCollapsed', 'false')
    }
  }, [isCollapsed])

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    navigate('/admin/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? '❯' : '❮'}
      </button>

      <div className="sidebar-header">
        <h2>{isCollapsed ? 'AD' : 'ADMIN'}</h2>
        <p className="sidebar-text">{admin.username}</p>
      </div>

      <nav className="sidebar-nav">
        <Link to="/admin/dashboard" className={`nav-item ${isActive('/admin/dashboard') ? 'active' : ''}`}>
          <span className="nav-icon">📊</span>
          <span className="sidebar-text">Dashboard</span>
        </Link>
        <Link to="/admin/programmes" className={`nav-item ${isActive('/admin/programmes') ? 'active' : ''}`}>
          <span className="nav-icon">📚</span>
          <span className="sidebar-text">Programmes</span>
        </Link>
        <Link to="/admin/fees" className={`nav-item ${isActive('/admin/fees') ? 'active' : ''}`}>
          <span className="nav-icon">💰</span>
          <span className="sidebar-text">Fees Manager</span>
        </Link>
        <Link to="/admin/applications" className={`nav-item ${isActive('/admin/applications') ? 'active' : ''}`}>
          <span className="nav-icon">📋</span>
          <span className="sidebar-text">Applications</span>
        </Link>
        <Link to="/admin/students" className={`nav-item ${isActive('/admin/students') ? 'active' : ''}`}>
          <span className="nav-icon">🎓</span>
          <span className="sidebar-text">Students</span>
        </Link>
        <Link to="/admin/calendar" className={`nav-item ${isActive('/admin/calendar') ? 'active' : ''}`}>
          <span className="nav-icon">📅</span>
          <span className="sidebar-text">Academic Calendar</span>
        </Link>
        <Link to="/admin/announcements" className={`nav-item ${isActive('/admin/announcements') ? 'active' : ''}`}>
          <span className="nav-icon">📢</span>
          <span className="sidebar-text">Announcements</span>
        </Link>
        <Link to="/admin/articles" className={`nav-item ${isActive('/admin/articles') ? 'active' : ''}`}>
          <span className="nav-icon">📝</span>
          <span className="sidebar-text">Articles & Posts</span>
        </Link>
        <Link to="/admin/about" className={`nav-item ${isActive('/admin/about') ? 'active' : ''}`}>
          <span className="nav-icon">ℹ️</span>
          <span className="sidebar-text">About Page Hero</span>
        </Link>
        <Link to="/admin/about-sections" className={`nav-item ${isActive('/admin/about-sections') ? 'active' : ''}`}>
          <span className="nav-icon">📑</span>
          <span className="sidebar-text">About Sections</span>
        </Link>
        <Link to="/admin/home-reasons" className={`nav-item ${isActive('/admin/home-reasons') ? 'active' : ''}`}>
          <span className="nav-icon">⭐</span>
          <span className="sidebar-text">Home Reasons</span>
        </Link>
        <Link to="/admin/messages" className={`nav-item ${isActive('/admin/messages') || isActive('/admin/messages/' + window.location.pathname.split('/').pop()) ? 'active' : ''}`}>
          <span className="nav-icon">✉️</span>
          <span className="sidebar-text">Messages</span>
        </Link>
        <Link to="/admin/communications" className={`nav-item ${isActive('/admin/communications') ? 'active' : ''}`}>
          <span className="nav-icon">🧾</span>
          <span className="sidebar-text">Communications</span>
        </Link>
        {admin.role === 'superadmin' && (
          <Link to="/admin/settings" className={`nav-item ${isActive('/admin/settings') ? 'active' : ''}`}>
            <span className="nav-icon">⚙️</span>
            <span className="sidebar-text">Settings</span>
          </Link>
        )}
      </nav>

      <button onClick={handleLogout} className="btn-logout">
        <span className="nav-icon">🚪</span>
        <span className="sidebar-text">Logout</span>
      </button>
    </aside>
  )
}
