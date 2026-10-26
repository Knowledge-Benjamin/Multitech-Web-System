import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  FileText,
  Clock,
  Radio,
  ArrowRight,
  GraduationCap,
  Calendar,
  Layers,
  Inbox
} from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import LecturerSidebar from '../components/LecturerSidebar'
import './AdminDashboard.css'
import './LecturerDashboard.css'

export default function LecturerDashboard() {
  const token = localStorage.getItem('lecturerToken')
  const [lecturer, setLecturer] = useState(null)

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

  const { data: resData, isLoading } = useApiQuery('/lecturer/courses', 'lecturerCourses', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const courses = resData?.data || []
  const term = resData?.term || null
  const totalMaterials = courses.reduce((sum, c) => sum + parseInt(c.materials_count || 0, 10), 0)
  const lecturerName = lecturer ? `${lecturer.first_name || ''} ${lecturer.last_name || ''}`.trim() : 'Academic Faculty'

  return (
    <div className="scope-lecturerdashboard scope-admindashboard admin-layout">
      <LecturerSidebar />

      <main className="admin-content">
        {/* Hero Section matching Admin standard */}
        <header className="dashboard-hero fade-in-item">
          <div className="hero-content">
            <h1>Welcome back, {lecturerName}!</h1>
            <p>
              Faculty Portal &bull; {lecturer?.department_name || 'Academic Faculty'}
              {term?.name && ` &bull; Academic Term: ${term.name}`}
            </p>
          </div>
          <div className="hero-decoration"></div>
        </header>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading course assignments...</p>
          </div>
        ) : (
          <>
            {/* Clickable Stats Grid */}
            <div className="stats-grid fade-in-section is-visible">
              <div className="stat-card fade-in-item">
                <div className="stat-icon-wrapper bg-blue">
                  <BookOpen size={24} className="text-blue" />
                </div>
                <div className="stat-content">
                  <h3>Assigned Courses</h3>
                  <div className="stat-value-row">
                    <p className="stat-number">{courses.length}</p>
                    <span className="trend positive">Active Term</span>
                  </div>
                </div>
              </div>

              <div className="stat-card fade-in-item">
                <div className="stat-icon-wrapper bg-indigo">
                  <FileText size={24} className="text-indigo" />
                </div>
                <div className="stat-content">
                  <h3>Course Materials</h3>
                  <div className="stat-value-row">
                    <p className="stat-number">{totalMaterials}</p>
                    <span className="trend neutral">Uploaded</span>
                  </div>
                </div>
              </div>

              <Link to="/lecturer/timetable" className="stat-card fade-in-item">
                <div className="stat-icon-wrapper bg-amber">
                  <Clock size={24} className="text-amber" />
                </div>
                <div className="stat-content">
                  <h3>Class Timetable</h3>
                  <div className="stat-value-row">
                    <p className="stat-number" style={{ fontSize: '1.25rem' }}>View</p>
                    <span className="trend positive">Schedule</span>
                  </div>
                </div>
              </Link>

              <Link to="/lecturer/attendance" className="stat-card fade-in-item">
                <div className="stat-icon-wrapper bg-emerald">
                  <Radio size={24} className="text-emerald" />
                </div>
                <div className="stat-content">
                  <h3>Live Attendance</h3>
                  <div className="stat-value-row">
                    <p className="stat-number" style={{ fontSize: '1.25rem' }}>Launch</p>
                    <span className="trend positive">BLE + GPS</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Courses Section */}
            <section className="recent-section" style={{ marginTop: '2rem' }}>
              <div className="section-header">
                <div>
                  <h2>Assigned Teaching Courses</h2>
                  <p className="section-subtitle">
                    Manage course syllabus, upload materials, record grades, and track student enrollment.
                  </p>
                </div>
              </div>

              {courses.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                  <Inbox size={48} strokeWidth={1.5} style={{ color: 'var(--color-text-light, #94a3b8)', marginBottom: '1rem' }} />
                  <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-secondary, #1e293b)' }}>No Courses Assigned</h3>
                  <p style={{ color: 'var(--color-text-secondary, #64748b)', maxWidth: '440px', margin: '0 auto' }}>
                    You have no active teaching courses assigned for this semester. Contact the academic registrar or department head for allocations.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
                  {courses.map(course => (
                    <div
                      key={course.course_id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'rgba(0, 82, 204, 0.08)',
                            color: 'var(--color-primary, #0052cc)'
                          }}>
                            {course.course_code}
                          </span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.8rem',
                            color: '#64748b'
                          }}>
                            <FileText size={14} />
                            {course.materials_count || 0} file{course.materials_count !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-secondary, #1e293b)' }}>
                          {course.name}
                        </h3>

                        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <GraduationCap size={15} style={{ flexShrink: 0 }} />
                          <span>{course.programme_name}</span>
                        </p>

                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginTop: 'auto',
                          paddingTop: '1rem',
                          borderTop: '1px solid #f1f5f9',
                          fontSize: '0.8rem',
                          color: '#475569'
                        }}>
                          <span style={{ background: '#f8fafc', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            Year {course.target_year}
                          </span>
                          <span style={{ background: '#f8fafc', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            Semester {course.target_semester}
                          </span>
                          <span style={{ background: '#f8fafc', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            {course.credits} Credits
                          </span>
                        </div>
                      </div>

                      <Link
                        to={`/lecturer/courses/${course.course_id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '12px 1.5rem',
                          background: '#f8fafc',
                          borderTop: '1px solid #e2e8f0',
                          textDecoration: 'none',
                          color: 'var(--color-primary, #0052cc)',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          transition: 'background 0.2s'
                        }}
                      >
                        Manage Course <ArrowRight size={16} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
