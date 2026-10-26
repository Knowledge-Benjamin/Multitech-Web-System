import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Clock,
  Radio,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import './AdminSidebar.css'

export default function LecturerSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [lecturer, setLecturer] = useState(null)
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('lecturerSidebarCollapsed') === 'true'
  })

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
    <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="scope-lecturersidebar sidebar-toggle" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="sidebar-header">
        <div className="avatar">{getInitials(lecturer)}</div>
        <div className="header-info">
          <h2>FACULTY PORTAL</h2>
          <p className="sidebar-text">{lecturerName}</p>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
            {lecturer?.department_name || 'Academic Department'}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav custom-scrollbar">
        <div className="nav-group-items">
          <Link to="/lecturer/dashboard" className={`nav-item ${isActive('/lecturer/dashboard') ? 'active' : ''}`}>
            <span className="nav-icon"><LayoutDashboard size={18} /></span>
            <span className="sidebar-text">Course Allocations</span>
          </Link>
          <Link to="/lecturer/timetable" className={`nav-item ${isActive('/lecturer/timetable') ? 'active' : ''}`}>
            <span className="nav-icon"><Clock size={18} /></span>
            <span className="sidebar-text">Teaching Timetable</span>
          </Link>
          <Link to="/lecturer/attendance" className={`nav-item ${isActive('/lecturer/attendance') ? 'active' : ''}`}>
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
  )
}
