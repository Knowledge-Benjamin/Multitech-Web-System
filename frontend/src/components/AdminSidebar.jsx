import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Banknote, ClipboardList, CalendarDays,
  GraduationCap, Users, Megaphone, FileText, Info, Layers, Star,
  Mail, FileSpreadsheet, Building2, Library, Building, Clock,
  Radio, BarChart2, Settings, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react'
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
      <button className="scope-adminsidebar sidebar-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="sidebar-header">
        <h2>{isCollapsed ? 'AD' : 'ADMIN'}</h2>
        <p className="sidebar-text">{admin.username}</p>
      </div>

      <nav className="sidebar-nav">
        <Link to="/admin/dashboard" className={`nav-item ${isActive('/admin/dashboard') ? 'active' : ''}`}>
          <span className="nav-icon"><LayoutDashboard size={18} /></span>
          <span className="sidebar-text">Dashboard</span>
        </Link>
        <Link to="/admin/programmes" className={`nav-item ${isActive('/admin/programmes') ? 'active' : ''}`}>
          <span className="nav-icon"><BookOpen size={18} /></span>
          <span className="sidebar-text">Programmes</span>
        </Link>
        <Link to="/admin/fees" className={`nav-item ${isActive('/admin/fees') ? 'active' : ''}`}>
          <span className="nav-icon"><Banknote size={18} /></span>
          <span className="sidebar-text">Fees Manager</span>
        </Link>
        <Link to="/admin/applications" className={`nav-item ${isActive('/admin/applications') ? 'active' : ''}`}>
          <span className="nav-icon"><ClipboardList size={18} /></span>
          <span className="sidebar-text">Applications</span>
        </Link>
        <Link to="/admin/intakes" className={`nav-item ${isActive('/admin/intakes') ? 'active' : ''}`}>
          <span className="nav-icon"><CalendarDays size={18} /></span>
          <span className="sidebar-text">Intakes</span>
        </Link>
        <Link to="/admin/students" className={`nav-item ${isActive('/admin/students') ? 'active' : ''}`}>
          <span className="nav-icon"><GraduationCap size={18} /></span>
          <span className="sidebar-text">Students</span>
        </Link>
        <Link to="/admin/lecturers" className={`nav-item ${isActive('/admin/lecturers') ? 'active' : ''}`}>
          <span className="nav-icon"><Users size={18} /></span>
          <span className="sidebar-text">Lecturers</span>
        </Link>
        <Link to="/admin/calendar" className={`nav-item ${isActive('/admin/calendar') ? 'active' : ''}`}>
          <span className="nav-icon"><CalendarDays size={18} /></span>
          <span className="sidebar-text">Academic Calendar</span>
        </Link>
        <Link to="/admin/announcements" className={`nav-item ${isActive('/admin/announcements') ? 'active' : ''}`}>
          <span className="nav-icon"><Megaphone size={18} /></span>
          <span className="sidebar-text">Announcements</span>
        </Link>
        <Link to="/admin/articles" className={`nav-item ${isActive('/admin/articles') ? 'active' : ''}`}>
          <span className="nav-icon"><FileText size={18} /></span>
          <span className="sidebar-text">Articles &amp; Posts</span>
        </Link>
        <Link to="/admin/about" className={`nav-item ${isActive('/admin/about') ? 'active' : ''}`}>
          <span className="nav-icon"><Info size={18} /></span>
          <span className="sidebar-text">About Page Hero</span>
        </Link>
        <Link to="/admin/about-sections" className={`nav-item ${isActive('/admin/about-sections') ? 'active' : ''}`}>
          <span className="nav-icon"><Layers size={18} /></span>
          <span className="sidebar-text">About Sections</span>
        </Link>
        <Link to="/admin/home-reasons" className={`nav-item ${isActive('/admin/home-reasons') ? 'active' : ''}`}>
          <span className="nav-icon"><Star size={18} /></span>
          <span className="sidebar-text">Home Reasons</span>
        </Link>
        <Link to="/admin/messages" className={`nav-item ${isActive('/admin/messages') || isActive('/admin/messages/' + window.location.pathname.split('/').pop()) ? 'active' : ''}`}>
          <span className="nav-icon"><Mail size={18} /></span>
          <span className="sidebar-text">Messages</span>
        </Link>
        <Link to="/admin/communications" className={`nav-item ${isActive('/admin/communications') ? 'active' : ''}`}>
          <span className="nav-icon"><FileSpreadsheet size={18} /></span>
          <span className="sidebar-text">Communications</span>
        </Link>

        {/* Academic Structure Group */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '0.5rem 0', paddingTop: '0.5rem' }}>
          <Link to="/admin/campuses" className={`nav-item ${isActive('/admin/campuses') ? 'active' : ''}`}>
            <span className="nav-icon"><Building2 size={18} /></span>
            <span className="sidebar-text">Campuses</span>
          </Link>
          <Link to="/admin/faculties" className={`nav-item ${isActive('/admin/faculties') ? 'active' : ''}`}>
            <span className="nav-icon"><Library size={18} /></span>
            <span className="sidebar-text">Faculties</span>
          </Link>
          <Link to="/admin/departments" className={`nav-item ${isActive('/admin/departments') ? 'active' : ''}`}>
            <span className="nav-icon"><Building size={18} /></span>
            <span className="sidebar-text">Departments</span>
          </Link>
        </div>

        {/* Academic Operations Group */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '0.5rem 0', paddingTop: '0.5rem' }}>
          <Link to="/admin/timetable" className={`nav-item ${isActive('/admin/timetable') ? 'active' : ''}`}>
            <span className="nav-icon"><Clock size={18} /></span>
            <span className="sidebar-text">Timetable</span>
          </Link>
          <Link to="/admin/attendance" className={`nav-item ${isActive('/admin/attendance') ? 'active' : ''}`}>
            <span className="nav-icon"><Radio size={18} /></span>
            <span className="sidebar-text">Live Session</span>
          </Link>
          <Link to="/admin/attendance/reports" className={`nav-item ${isActive('/admin/attendance/reports') ? 'active' : ''}`}>
            <span className="nav-icon"><BarChart2 size={18} /></span>
            <span className="sidebar-text">Reports</span>
          </Link>
        </div>

        {admin.role === 'superadmin' && (
          <Link to="/admin/settings" className={`nav-item ${isActive('/admin/settings') ? 'active' : ''}`}>
            <span className="nav-icon"><Settings size={18} /></span>
            <span className="sidebar-text">Settings</span>
          </Link>
        )}
      </nav>

      <button onClick={handleLogout} className="btn-logout">
        <span className="nav-icon"><LogOut size={18} /></span>
        <span className="sidebar-text">Logout</span>
      </button>
    </aside>
  )
}
