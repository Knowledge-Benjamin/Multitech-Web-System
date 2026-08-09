import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Clock, Radio, LogOut, GraduationCap } from 'lucide-react'
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
    <aside className="scope-lecturersidebar lecturer-sidebar">
      <div className="sidebar-brand">
        <GraduationCap size={24} strokeWidth={1.5} />
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
          <LayoutDashboard size={18} /> Dashboard (Courses)
        </Link>
        <Link to="/lecturer/timetable" className={`nav-item ${isActive('/lecturer/timetable') ? 'active' : ''}`}>
          <Clock size={18} /> My Timetable
        </Link>
        <Link to="/lecturer/attendance" className={`nav-item ${isActive('/lecturer/attendance') ? 'active' : ''}`}>
          <Radio size={18} /> Live Attendance
        </Link>
      </nav>

      <button className="sidebar-logout" onClick={handleLogout}>
        <LogOut size={18} /> Logout
      </button>
    </aside>
  )
}
