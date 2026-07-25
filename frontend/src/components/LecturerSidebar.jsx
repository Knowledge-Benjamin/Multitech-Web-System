import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import '../pages/LecturerDashboard.css'

export default function LecturerSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [lecturer, setLecturer] = useState(null)

  useEffect(() => {
    const info = localStorage.getItem('lecturerInfo')
    if (info) setLecturer(JSON.parse(info))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('lecturerToken')
    localStorage.removeItem('lecturerInfo')
    navigate('/lecturer/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <aside className="lecturer-sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">🎓</span>
        <div>
          <span className="brand-name">Multitech</span>
          <span className="brand-sub">Lecturer Portal</span>
        </div>
      </div>

      <div className="sidebar-lecturer-card">
        <div className="lecturer-avatar">
          {lecturer ? lecturer.first_name[0] + lecturer.last_name[0] : '??'}
        </div>
        <div>
          <div className="lecturer-name">{lecturer ? `${lecturer.first_name} ${lecturer.last_name}` : '...'}</div>
          <div className="lecturer-role">Lecturer</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <Link to="/lecturer/dashboard" className={`nav-item ${isActive('/lecturer/dashboard') ? 'active' : ''}`}>
          <span>📊</span> Dashboard (Courses)
        </Link>
        <Link to="/lecturer/timetable" className={`nav-item ${isActive('/lecturer/timetable') ? 'active' : ''}`}>
          <span>📅</span> My Timetable
        </Link>
        <Link to="/lecturer/attendance" className={`nav-item ${isActive('/lecturer/attendance') ? 'active' : ''}`}>
          <span>📡</span> Live Attendance
        </Link>
      </nav>

      <button className="sidebar-logout" onClick={handleLogout}>
        <span>🚪</span> Logout
      </button>
    </aside>
  )
}
