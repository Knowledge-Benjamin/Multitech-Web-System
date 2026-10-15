import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CreditCard, BookOpen, Clock, Megaphone,
  Award, CheckSquare, FileText, User, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react'
import './AdminSidebar.css'

export default function StudentSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const student = JSON.parse(localStorage.getItem('studentUser') || '{}')
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('studentSidebarCollapsed') === 'true'
  })

  // Ensure body layout classes match admin standard
  useEffect(() => {
    document.body.classList.add('admin-page')
    if (localStorage.getItem('studentSidebarCollapsed') === 'true') {
      document.body.classList.add('sidebar-collapsed')
    }
    return () => {
      document.body.classList.remove('admin-page', 'sidebar-collapsed')
    }
  }, [])

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
    navigate('/portal/login?tab=student')
  }

  const isActive = (path) => location.pathname === path

  const getInitials = (name) => {
    if (!name) return 'ST'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="scope-studentsidebar sidebar-toggle" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="sidebar-header">
        <div className="avatar">{getInitials(student.name)}</div>
        <div className="header-info">
          <h2>STUDENT PORTAL</h2>
          <p className="sidebar-text">{student.name || 'Student'}</p>
          {student.student_number && (
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
              {student.student_number}
            </span>
          )}
        </div>
      </div>

      <nav className="sidebar-nav custom-scrollbar">
        <div className="nav-group-items">
          <Link to="/student/dashboard" className={`nav-item ${isActive('/student/dashboard') ? 'active' : ''}`}>
            <span className="nav-icon"><LayoutDashboard size={18} /></span>
            <span className="sidebar-text">Dashboard</span>
          </Link>
          <Link to="/student/finances" className={`nav-item ${isActive('/student/finances') ? 'active' : ''}`}>
            <span className="nav-icon"><CreditCard size={18} /></span>
            <span className="sidebar-text">Financials</span>
          </Link>
          <Link to="/student/courses" className={`nav-item ${isActive('/student/courses') ? 'active' : ''}`}>
            <span className="nav-icon"><BookOpen size={18} /></span>
            <span className="sidebar-text">My Courses</span>
          </Link>
          <Link to="/student/timetable" className={`nav-item ${isActive('/student/timetable') ? 'active' : ''}`}>
            <span className="nav-icon"><Clock size={18} /></span>
            <span className="sidebar-text">Timetable</span>
          </Link>
          <Link to="/student/announcements" className={`nav-item ${isActive('/student/announcements') ? 'active' : ''}`}>
            <span className="nav-icon"><Megaphone size={18} /></span>
            <span className="sidebar-text">Announcements</span>
          </Link>
          <Link to="/student/results" className={`nav-item ${isActive('/student/results') ? 'active' : ''}`}>
            <span className="nav-icon"><Award size={18} /></span>
            <span className="sidebar-text">Results &amp; Grades</span>
          </Link>
          <Link to="/student/attendance" className={`nav-item ${isActive('/student/attendance') ? 'active' : ''}`}>
            <span className="nav-icon"><CheckSquare size={18} /></span>
            <span className="sidebar-text">My Attendance</span>
          </Link>
          <Link to="/student/exams" className={`nav-item ${isActive('/student/exams') ? 'active' : ''}`}>
            <span className="nav-icon"><FileText size={18} /></span>
            <span className="sidebar-text">Exams &amp; Pass</span>
          </Link>
          <Link to="/student/profile" className={`nav-item ${isActive('/student/profile') ? 'active' : ''}`}>
            <span className="nav-icon"><User size={18} /></span>
            <span className="sidebar-text">Profile</span>
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
