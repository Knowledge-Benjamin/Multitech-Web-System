import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useApiQuery } from '../hooks/useApiQuery'
import {
  LayoutDashboard, BookOpen, Banknote, ClipboardList, CalendarDays,
  GraduationCap, Users, Megaphone, FileText, Info, Layers, Star,
  Mail, FileSpreadsheet, Building2, Library, Building, Clock,
  Radio, BarChart2, Settings, LogOut, ChevronLeft, ChevronRight,
  ChevronDown, CreditCard, Menu, X
} from 'lucide-react'
import './AdminSidebar.css'

export default function AdminSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const admin = JSON.parse(localStorage.getItem('adminUser') || '{}')
  const { data: profileResponse } = useApiQuery('/auth/profile', `adminProfile-${admin.id || 'current'}`, {
    queryOptions: {
      enabled: Boolean(localStorage.getItem('adminToken')),
      staleTime: 5 * 60 * 1000
    }
  })
  const adminName = profileResponse?.profile?.username || admin.username || 'Administrator'
  const avatarUrl = profileResponse?.profile?.photo_url || admin.photo_url || admin.avatar_url
  const adminInitials = adminName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || 'AD'
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true'
  })
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)

  useEffect(() => {
    setAvatarLoadFailed(false)
  }, [avatarUrl])

  useEffect(() => {
    if (!isMobileOpen) return
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMobileOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isMobileOpen])

  // Group expansion state
  const [expandedGroups, setExpandedGroups] = useState({
    academics: true,
    website: true,
    structure: true,
    operations: true
  })

  // Mount effect: mark body as admin page & apply initial collapse state
  useEffect(() => {
    document.body.classList.add('admin-page')
    // Sync initial state
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
      document.body.classList.add('sidebar-collapsed')
    }
    return () => {
      document.body.classList.remove('admin-page', 'sidebar-collapsed')
    }
  }, [])

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

  const toggleGroup = (group) => {
    if (isCollapsed) setIsCollapsed(false) // Expanding a group should expand the sidebar
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }))
  }

  return (
    <>
      <div className="portal-mobile-bar">
        <button
          type="button"
          className="portal-mobile-menu"
          onClick={() => setIsMobileOpen(open => !open)}
          aria-expanded={isMobileOpen}
          aria-controls="admin-primary-navigation"
          aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          <span>{isMobileOpen ? 'Close' : 'Menu'}</span>
        </button>
        <span className="portal-mobile-brand">Multitech <span>Admin</span></span>
      </div>
      {isMobileOpen && (
        <button
          type="button"
          className="portal-sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close navigation menu"
        />
      )}
      <aside className={`admin-sidebar admin-sidebar--admin ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <button
          type="button"
          className="scope-adminsidebar sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="sidebar-header">
          <img src="/logo_asset.png" alt="Multitech Business School" className="sidebar-logo" />
          <div className="sidebar-account">
            <div className="avatar">
              {avatarUrl && !avatarLoadFailed ? (
                <img
                  src={avatarUrl}
                  alt={`${adminName} profile`}
                  className="admin-avatar-image"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : adminInitials}
            </div>
            <div className="header-info">
              <h2>Admin portal</h2>
              <p className="sidebar-text">{adminName}</p>
            </div>
          </div>
        </div>

      <nav
        id="admin-primary-navigation"
        className="sidebar-nav custom-scrollbar"
        aria-label="Primary navigation"
        onClick={(event) => {
          if (event.target.closest('a')) setIsMobileOpen(false)
        }}
      >
        {/* Main Dashboard - No Group */}
        <div className="nav-group-items">
          <Link to="/admin/dashboard" title="Dashboard" className={`nav-item ${isActive('/admin/dashboard') ? 'active' : ''}`}>
            <span className="nav-icon"><LayoutDashboard size={20} /></span>
            <span className="sidebar-text">Dashboard</span>
          </Link>
        </div>

        {/* Academics & Admissions */}
        <div className="nav-group">
          <button type="button" className="group-header" onClick={() => toggleGroup('academics')} aria-expanded={expandedGroups.academics} aria-label="Admissions and Academics">
            <span className="group-title">Admissions & Academics</span>
            <ChevronDown size={14} className={`group-chevron ${expandedGroups.academics ? 'open' : ''}`} />
          </button>
          <div className={`group-items ${expandedGroups.academics ? 'expanded' : ''}`}>
            <div className="group-items-inner">
            <Link to="/admin/programmes" title="Programmes" className={`nav-item ${isActive('/admin/programmes') ? 'active' : ''}`}>
              <span className="nav-icon"><BookOpen size={18} /></span>
              <span className="sidebar-text">Programmes</span>
            </Link>
            <Link to="/admin/applications" title="Applications" className={`nav-item ${isActive('/admin/applications') ? 'active' : ''}`}>
              <span className="nav-icon"><ClipboardList size={18} /></span>
              <span className="sidebar-text">Applications</span>
            </Link>
            <Link to="/admin/intakes" title="Intakes" className={`nav-item ${isActive('/admin/intakes') ? 'active' : ''}`}>
              <span className="nav-icon"><CalendarDays size={18} /></span>
              <span className="sidebar-text">Intakes</span>
            </Link>
            <Link to="/admin/students" title="Students" className={`nav-item ${isActive('/admin/students') ? 'active' : ''}`}>
              <span className="nav-icon"><GraduationCap size={18} /></span>
              <span className="sidebar-text">Students</span>
            </Link>
            <Link to="/admin/lecturers" title="Lecturers" className={`nav-item ${isActive('/admin/lecturers') ? 'active' : ''}`}>
              <span className="nav-icon"><Users size={18} /></span>
              <span className="sidebar-text">Lecturers</span>
            </Link>
            <Link to="/admin/fees" title="Fees Manager" className={`nav-item ${isActive('/admin/fees') ? 'active' : ''}`}>
              <span className="nav-icon"><Banknote size={18} /></span>
              <span className="sidebar-text">Fees Manager</span>
            </Link>
            <Link to="/admin/calendar" title="Academic Calendar" className={`nav-item ${isActive('/admin/calendar') ? 'active' : ''}`}>
              <span className="nav-icon"><CalendarDays size={18} /></span>
              <span className="sidebar-text">Academic Calendar</span>
            </Link>
            <Link to="/admin/id-cards" title="Institutional ID Cards" className={`nav-item ${isActive('/admin/id-cards') ? 'active' : ''}`}>
              <span className="nav-icon"><CreditCard size={18} /></span>
              <span className="sidebar-text">Institutional ID Cards</span>
            </Link>
          </div>
                    </div>
          </div>

        {/* Website Content */}
        <div className="nav-group">
          <button type="button" className="group-header" onClick={() => toggleGroup('website')} aria-expanded={expandedGroups.website} aria-label="Website Content">
            <span className="group-title">Website Content</span>
            <ChevronDown size={14} className={`group-chevron ${expandedGroups.website ? 'open' : ''}`} />
          </button>
          <div className={`group-items ${expandedGroups.website ? 'expanded' : ''}`}>
            <div className="group-items-inner">
            <Link to="/admin/announcements" title="Announcements" className={`nav-item ${isActive('/admin/announcements') ? 'active' : ''}`}>
              <span className="nav-icon"><Megaphone size={18} /></span>
              <span className="sidebar-text">Announcements</span>
            </Link>
            <Link to="/admin/articles" title="Articles & Posts" className={`nav-item ${isActive('/admin/articles') ? 'active' : ''}`}>
              <span className="nav-icon"><FileText size={18} /></span>
              <span className="sidebar-text">Articles & Posts</span>
            </Link>
            <Link to="/admin/about" title="About Hero" className={`nav-item ${isActive('/admin/about') ? 'active' : ''}`}>
              <span className="nav-icon"><Info size={18} /></span>
              <span className="sidebar-text">About Hero</span>
            </Link>
            <Link to="/admin/about-sections" title="About Sections" className={`nav-item ${isActive('/admin/about-sections') ? 'active' : ''}`}>
              <span className="nav-icon"><Layers size={18} /></span>
              <span className="sidebar-text">About Sections</span>
            </Link>
            <Link to="/admin/home-reasons" title="Home Reasons" className={`nav-item ${isActive('/admin/home-reasons') ? 'active' : ''}`}>
              <span className="nav-icon"><Star size={18} /></span>
              <span className="sidebar-text">Home Reasons</span>
            </Link>
            <Link to="/admin/messages" title="Messages" className={`nav-item ${isActive('/admin/messages') || isActive('/admin/messages/' + window.location.pathname.split('/').pop()) ? 'active' : ''}`}>
              <span className="nav-icon"><Mail size={18} /></span>
              <span className="sidebar-text">Messages</span>
            </Link>
            <Link to="/admin/communications" title="Communications" className={`nav-item ${isActive('/admin/communications') ? 'active' : ''}`}>
              <span className="nav-icon"><FileSpreadsheet size={18} /></span>
              <span className="sidebar-text">Communications</span>
            </Link>
          </div>
                    </div>
          </div>

        {/* Academic Structure */}
        <div className="nav-group">
          <button type="button" className="group-header" onClick={() => toggleGroup('structure')} aria-expanded={expandedGroups.structure} aria-label="Organization">
            <span className="group-title">Organization</span>
            <ChevronDown size={14} className={`group-chevron ${expandedGroups.structure ? 'open' : ''}`} />
          </button>
          <div className={`group-items ${expandedGroups.structure ? 'expanded' : ''}`}>
            <div className="group-items-inner">
            <Link to="/admin/campuses" title="Campuses" className={`nav-item ${isActive('/admin/campuses') ? 'active' : ''}`}>
              <span className="nav-icon"><Building2 size={18} /></span>
              <span className="sidebar-text">Campuses</span>
            </Link>
            <Link to="/admin/faculties" title="Faculties" className={`nav-item ${isActive('/admin/faculties') ? 'active' : ''}`}>
              <span className="nav-icon"><Library size={18} /></span>
              <span className="sidebar-text">Faculties</span>
            </Link>
            <Link to="/admin/departments" title="Departments" className={`nav-item ${isActive('/admin/departments') ? 'active' : ''}`}>
              <span className="nav-icon"><Building size={18} /></span>
              <span className="sidebar-text">Departments</span>
            </Link>
          </div>
                    </div>
          </div>

        {/* Operations */}
        <div className="nav-group">
          <button type="button" className="group-header" onClick={() => toggleGroup('operations')} aria-expanded={expandedGroups.operations} aria-label="Operations">
            <span className="group-title">Operations</span>
            <ChevronDown size={14} className={`group-chevron ${expandedGroups.operations ? 'open' : ''}`} />
          </button>
          <div className={`group-items ${expandedGroups.operations ? 'expanded' : ''}`}>
            <div className="group-items-inner">
            <Link to="/admin/timetable" title="Timetable" className={`nav-item ${isActive('/admin/timetable') ? 'active' : ''}`}>
              <span className="nav-icon"><Clock size={18} /></span>
              <span className="sidebar-text">Timetable</span>
            </Link>
            <Link to="/admin/attendance" title="Live Session" className={`nav-item ${isActive('/admin/attendance') ? 'active' : ''}`}>
              <span className="nav-icon"><Radio size={18} /></span>
              <span className="sidebar-text">Live Session</span>
            </Link>
            <Link to="/admin/attendance/reports" title="Reports" className={`nav-item ${isActive('/admin/attendance/reports') ? 'active' : ''}`}>
              <span className="nav-icon"><BarChart2 size={18} /></span>
              <span className="sidebar-text">Reports</span>
            </Link>
          </div>
                    </div>
          </div>
        </nav>

        <div className="sidebar-footer">
        {admin.role === 'superadmin' && (
          <Link to="/admin/settings" title="Settings" className={`nav-item ${isActive('/admin/settings') ? 'active' : ''}`}>
            <span className="nav-icon"><Settings size={18} /></span>
            <span className="sidebar-text">Settings</span>
          </Link>
        )}
        <button type="button" onClick={handleLogout} className="btn-logout" aria-label="Sign out">
          <span className="nav-icon"><LogOut size={18} /></span>
          <span className="sidebar-text">Logout</span>
        </button>
        </div>
      </aside>
    </>
  )
}
