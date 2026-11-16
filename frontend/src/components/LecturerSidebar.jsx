import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Clock,
  Radio,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'
import './AdminSidebar.css'

export default function LecturerSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [lecturer, setLecturer] = useState(null)
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('lecturerSidebarCollapsed') === 'true'
  })
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    if (!isMobileOpen) return
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMobileOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isMobileOpen])

  useEffect(() => {
    const info = localStorage.getItem('lecturerInfo')
    if (info) {
      try {
        setLecturer(JSON.parse(info))
      } catch (e) {
        // invalid JSON
      }
    }
  }, [])

  // Ensure body layout classes match admin standard
  useEffect(() => {
    document.body.classList.add('admin-page')
    if (localStorage.getItem('lecturerSidebarCollapsed') === 'true') {
      document.body.classList.add('sidebar-collapsed')
    }
    return () => {
      document.body.classList.remove('admin-page', 'sidebar-collapsed')
    }
  }, [])

  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed')
      localStorage.setItem('lecturerSidebarCollapsed', 'true')
    } else {
      document.body.classList.remove('sidebar-collapsed')
      localStorage.setItem('lecturerSidebarCollapsed', 'false')
    }
  }, [isCollapsed])

  const handleLogout = () => {
    localStorage.removeItem('lecturerToken')
    localStorage.removeItem('lecturerInfo')
    navigate('/portal/login?tab=lecturer')
  }

  const isActive = (path) => {
    if (path === '/lecturer/dashboard') {
      return location.pathname === '/lecturer/dashboard' || location.pathname.startsWith('/lecturer/courses')
    }
    return location.pathname === path
  }

  const getInitials = (lec) => {
    if (!lec) return 'FP'
    const fn = (lec.first_name || '')[0] || ''
    const ln = (lec.last_name || '')[0] || ''
    return `${fn}${ln}`.toUpperCase() || 'FP'
  }

  const lecturerName = lecturer ? `${lecturer.first_name || ''} ${lecturer.last_name || ''}`.trim() : 'Academic Faculty'

  return (
    <>
      <div className="portal-mobile-bar">
        <button
          type="button"
          className="portal-mobile-menu"
          onClick={() => setIsMobileOpen(open => !open)}
          aria-expanded={isMobileOpen}
          aria-controls="lecturer-primary-navigation"
          aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          <span>{isMobileOpen ? 'Close' : 'Menu'}</span>
        </button>
        <span className="portal-mobile-brand">Multitech <span>Faculty</span></span>
      </div>
      {isMobileOpen && (
        <button
          type="button"
          className="portal-sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close navigation menu"
        />
      )}
      <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <button
          type="button"
          className="scope-lecturersidebar sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="sidebar-header">
          <div className="avatar">{getInitials(lecturer)}</div>
          <div className="header-info">
            <h2>FACULTY PORTAL</h2>
            <p className="sidebar-text">{lecturerName}</p>
            <span className="sidebar-account-id">
              {lecturer?.department_name || 'Academic Department'}
            </span>
          </div>
        </div>

      <nav
        id="lecturer-primary-navigation"
        className="sidebar-nav custom-scrollbar"
        aria-label="Primary navigation"
        onClick={(event) => {
          if (event.target.closest('a')) setIsMobileOpen(false)
        }}
      >
        <div className="nav-group-items">
          <Link to="/lecturer/dashboard" title="Course Allocations" className={`nav-item ${isActive('/lecturer/dashboard') ? 'active' : ''}`}>
            <span className="nav-icon"><LayoutDashboard size={18} /></span>
            <span className="sidebar-text">Course Allocations</span>
          </Link>
          <Link to="/lecturer/timetable" title="Teaching Timetable" className={`nav-item ${isActive('/lecturer/timetable') ? 'active' : ''}`}>
            <span className="nav-icon"><Clock size={18} /></span>
            <span className="sidebar-text">Teaching Timetable</span>
          </Link>
          <Link to="/lecturer/attendance" title="Live Attendance" className={`nav-item ${isActive('/lecturer/attendance') ? 'active' : ''}`}>
            <span className="nav-icon"><Radio size={18} /></span>
            <span className="sidebar-text">Live Attendance</span>
          </Link>
        </div>
        </nav>

        <button onClick={handleLogout} className="btn-logout" aria-label="Sign out">
          <span className="nav-icon"><LogOut size={18} /></span>
          <span className="sidebar-text">Sign Out</span>
        </button>
      </aside>
    </>
  )
}
