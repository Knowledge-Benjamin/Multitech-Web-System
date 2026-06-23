import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import './AdminSidebar.css'

export default function StudentSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const student = JSON.parse(localStorage.getItem('studentUser') || '{}')
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('studentSidebarCollapsed') === 'true'
  })

  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed')
      localStorage.setItem('studentSidebarCollapsed', 'true')
    } else {
      document.body.classList.remove('sidebar-collapsed')
      localStorage.setItem('studentSidebarCollapsed', 'false')
    }
  }, [isCollapsed])

  const handleLogout = () => {
    localStorage.removeItem('studentToken')
    localStorage.removeItem('studentUser')
    navigate('/student/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ background: 'var(--color-surface)' }}>
      <button className="sidebar-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? '❯' : '❮'}
      </button>

      <div className="sidebar-header">
        <h2>{isCollapsed ? 'SP' : 'STUDENT'}</h2>
        <p className="sidebar-text" style={{ color: 'var(--color-primary)' }}>{student.name}</p>
      </div>

      <nav className="sidebar-nav">
        <Link to="/student/dashboard" className={`nav-item ${isActive('/student/dashboard') ? 'active' : ''}`}>
          <span className="nav-icon">📊</span>
          <span className="sidebar-text">Dashboard</span>
        </Link>
        <Link to="/student/finances" className={`nav-item ${isActive('/student/finances') ? 'active' : ''}`}>
          <span className="nav-icon">💳</span>
          <span className="sidebar-text">Financials</span>
        </Link>
        <Link to="/student/courses" className={`nav-item ${isActive('/student/courses') ? 'active' : ''}`}>
          <span className="nav-icon">📚</span>
          <span className="sidebar-text">My Courses</span>
        </Link>
        <Link to="/student/profile" className={`nav-item ${isActive('/student/profile') ? 'active' : ''}`}>
          <span className="nav-icon">👤</span>
          <span className="sidebar-text">Profile</span>
        </Link>
      </nav>

      <button onClick={handleLogout} className="btn-logout">
        <span className="nav-icon">🚪</span>
        <span className="sidebar-text">Logout</span>
      </button>
    </aside>
  )
}
