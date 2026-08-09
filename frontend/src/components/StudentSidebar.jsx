import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CreditCard, BookOpen, Clock, Megaphone,
  Trophy, TrendingUp, FileText, User, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react'
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
    <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button className="scope-studentsidebar sidebar-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="sidebar-header">
        <h2>{isCollapsed ? 'SP' : 'STUDENT'}</h2>
        <p className="sidebar-text">{student.name}</p>
      </div>

      <nav className="sidebar-nav">
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
          <span className="nav-icon"><Trophy size={18} /></span>
          <span className="sidebar-text">Results &amp; Transcript</span>
        </Link>
        <Link to="/student/attendance" className={`nav-item ${isActive('/student/attendance') ? 'active' : ''}`}>
          <span className="nav-icon"><TrendingUp size={18} /></span>
          <span className="sidebar-text">My Attendance</span>
        </Link>
        <Link to="/student/exams" className={`nav-item ${isActive('/student/exams') ? 'active' : ''}`}>
          <span className="nav-icon"><FileText size={18} /></span>
          <span className="sidebar-text">Exams</span>
        </Link>
        <Link to="/student/profile" className={`nav-item ${isActive('/student/profile') ? 'active' : ''}`}>
          <span className="nav-icon"><User size={18} /></span>
          <span className="sidebar-text">Profile</span>
        </Link>
      </nav>

      <button onClick={handleLogout} className="btn-logout">
        <span className="nav-icon"><LogOut size={18} /></span>
        <span className="sidebar-text">Logout</span>
      </button>
    </aside>
  )
}
