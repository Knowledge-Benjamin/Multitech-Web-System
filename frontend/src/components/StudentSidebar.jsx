import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useApiQuery } from '../hooks/useApiQuery'
import {
  LayoutDashboard, CreditCard, BookOpen, Clock, Megaphone,
  Award, CheckSquare, FileText, User, LogOut, ChevronLeft, ChevronRight,
  Menu, X
} from 'lucide-react'
import './AdminSidebar.css'

export default function StudentSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const student = JSON.parse(localStorage.getItem('studentUser') || '{}')
  const API = import.meta.env.VITE_API_URL
  const { data: profileResponse } = useApiQuery(`${API}/student-profile`, 'studentDashboardProfile', {
    queryOptions: { staleTime: 5 * 60 * 1000 }
  })
  const avatarPhotoUrl = profileResponse?.data?.profile?.passport_photo_url || student.photo_url
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('studentSidebarCollapsed') === 'true'
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
    setAvatarLoadFailed(false)
  }, [avatarPhotoUrl])

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
    <>
      <div className="portal-mobile-bar">
        <button
          type="button"
          className="portal-mobile-menu"
          onClick={() => setIsMobileOpen(open => !open)}
          aria-expanded={isMobileOpen}
          aria-controls="student-primary-navigation"
          aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          <span>{isMobileOpen ? 'Close' : 'Menu'}</span>
        </button>
        <span className="portal-mobile-brand">Multitech <span>Student</span></span>
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
          className="scope-studentsidebar sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="sidebar-header">
          <div className="avatar">
            {avatarPhotoUrl && !avatarLoadFailed ? (
              <img
                className="student-avatar-image"
                src={avatarPhotoUrl}
                alt={`${student.name || 'Student'} profile`}
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : getInitials(student.name)}
          </div>
          <div className="header-info">
            <h2>STUDENT PORTAL</h2>
            <p className="sidebar-text">{student.name || 'Student'}</p>
            {student.student_number && (
              <span className="sidebar-account-id">
                {student.student_number}
              </span>
            )}
          </div>
        </div>

      <nav
        id="student-primary-navigation"
        className="sidebar-nav custom-scrollbar"
        aria-label="Primary navigation"
        onClick={(event) => {
          if (event.target.closest('a')) setIsMobileOpen(false)
        }}
      >
        <div className="nav-group-items">
          <Link to="/student/dashboard" title="Dashboard" className={`nav-item ${isActive('/student/dashboard') ? 'active' : ''}`}>
            <span className="nav-icon"><LayoutDashboard size={18} /></span>
            <span className="sidebar-text">Dashboard</span>
          </Link>
          <Link to="/student/finances" title="Financials" className={`nav-item ${isActive('/student/finances') ? 'active' : ''}`}>
            <span className="nav-icon"><CreditCard size={18} /></span>
            <span className="sidebar-text">Financials</span>
          </Link>
          <Link to="/student/courses" title="My Courses" className={`nav-item ${isActive('/student/courses') ? 'active' : ''}`}>
            <span className="nav-icon"><BookOpen size={18} /></span>
            <span className="sidebar-text">My Courses</span>
          </Link>
          <Link to="/student/timetable" title="Timetable" className={`nav-item ${isActive('/student/timetable') ? 'active' : ''}`}>
            <span className="nav-icon"><Clock size={18} /></span>
            <span className="sidebar-text">Timetable</span>
          </Link>
          <Link to="/student/announcements" title="Announcements" className={`nav-item ${isActive('/student/announcements') ? 'active' : ''}`}>
            <span className="nav-icon"><Megaphone size={18} /></span>
            <span className="sidebar-text">Announcements</span>
          </Link>
          <Link to="/student/results" title="Results and Grades" className={`nav-item ${isActive('/student/results') ? 'active' : ''}`}>
            <span className="nav-icon"><Award size={18} /></span>
            <span className="sidebar-text">Results &amp; Grades</span>
          </Link>
          <Link to="/student/attendance" title="My Attendance" className={`nav-item ${isActive('/student/attendance') ? 'active' : ''}`}>
            <span className="nav-icon"><CheckSquare size={18} /></span>
            <span className="sidebar-text">My Attendance</span>
          </Link>
          <Link to="/student/exams" title="Exams and Pass" className={`nav-item ${isActive('/student/exams') ? 'active' : ''}`}>
            <span className="nav-icon"><FileText size={18} /></span>
            <span className="sidebar-text">Exams &amp; Pass</span>
          </Link>
          <Link to="/student/profile" title="Profile" className={`nav-item ${isActive('/student/profile') ? 'active' : ''}`}>
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
    </>
  )
}
