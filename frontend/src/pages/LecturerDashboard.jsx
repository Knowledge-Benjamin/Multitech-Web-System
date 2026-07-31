import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import LecturerSidebar from '../components/LecturerSidebar'
import './LecturerDashboard.css'

export default function LecturerDashboard() {
  const [courses, setCourses] = useState([])
  const [term, setTerm] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const res = await api.get('/lecturer/courses')
      setCourses(res.data.data || [])
      setTerm(res.data.term)
    } catch (err) {
      console.error('Failed to fetch courses:', err)
    } finally {
      setLoading(false)
    }
  }



  const getFileIcon = (count) => count > 0 ? '📂' : '📁'

  return (
    <div className="lecturer-layout">
      {/* Sidebar */}
      <LecturerSidebar />

      {/* Main Content */}
      <main className="lecturer-main">
        <header className="lecturer-topbar">
          <div>
            <h1>My Teaching Dashboard</h1>
            {term && <p className="term-badge">📅 Current Term: <strong>{term.name}</strong></p>}
          </div>
        </header>

        {loading ? (
          <div className="lecturer-loading">
            <div className="spinner-ring"></div>
            <p>Loading your courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="lecturer-empty">
            <span>📭</span>
            <h2>No Courses Assigned</h2>
            <p>You have no courses assigned for the current term. Please contact the administrator.</p>
          </div>
        ) : (
          <>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-value">{courses.length}</div>
                <div className="stat-label">Courses This Term</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{courses.reduce((s, c) => s + parseInt(c.materials_count || 0), 0)}</div>
                <div className="stat-label">Materials Uploaded</div>
              </div>
            </div>

            <h2 className="section-title">Your Assigned Courses</h2>
            <div className="courses-grid">
              {courses.map(course => (
                <Link
                  to={`/lecturer/courses/${course.course_id}`}
                  key={course.course_id}
                  className="course-card-link"
                >
                  <div className="lecturer-course-card">
                    <div className="course-card-header">
                      <div className="course-badge">{course.course_code}</div>
                      <div className="materials-chip">
                        {getFileIcon(course.materials_count)} {course.materials_count} file{course.materials_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <h3 className="course-card-name">{course.name}</h3>
                    <p className="course-card-programme">{course.programme_name}</p>
                    <div className="course-card-meta">
                      <span>Year {course.target_year}</span>
                      <span>·</span>
                      <span>Semester {course.target_semester}</span>
                      <span>·</span>
                      <span>{course.credits} Credits</span>
                    </div>
                    <div className="course-card-action">
                      Manage Course →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
