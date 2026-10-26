import { useApiQuery } from '../hooks/useApiQuery'
import StudentSidebar from '../components/StudentSidebar'
import { Printer, Award, BookOpen, TrendingUp, Inbox } from 'lucide-react'
import './AdminDashboard.css'
import './StudentResults.css'

export default function StudentResults() {
  const token = localStorage.getItem('studentToken')
  const { data: resData, isLoading, error: apiError } = useApiQuery(`${import.meta.env.VITE_API_URL}/student-profile/results`, 'studentResults', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const data = resData?.data
  const error = apiError ? 'Could not load your academic results. Please try again later.' : ''

  const getGradeBadge = (letter) => {
    switch(letter) {
      case 'A': return <span className="status-pill status-admitted">Grade A</span>
      case 'B+': return <span className="status-pill status-admitted">Grade B+</span>
      case 'B': return <span className="status-pill status-admitted">Grade B</span>
      case 'C': return <span className="status-pill status-pending">Grade C</span>
      case 'D': return <span className="status-pill status-pending">Grade D</span>
      case 'F': return <span className="status-pill status-rejected">Grade F</span>
      default: return <span className="status-pill">{letter || 'Pending'}</span>
    }
  }

  return (
    <div className="scope-studentresults scope-admindashboard admin-layout">
      <StudentSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)' }}>
        <header className="content-header hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-secondary)', margin: '0 0 0.25rem 0' }}>Academic Results &amp; Transcript</h1>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Cumulative grade point average (CGPA) and semester performance records</p>
          </div>
          <button 
            className="button button-primary hide-on-print" 
            onClick={() => window.print()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Printer size={16} /> Print Transcript
          </button>
        </header>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading academic transcript...</p>
          </div>
        ) : error ? (
          <div className="message-error" style={{ marginBottom: '1.5rem' }}>{error}</div>
        ) : !data || data.terms?.length === 0 ? (
          <div className="empty-state" style={{ padding: '3.5rem', background: 'white', borderRadius: '16px', textAlign: 'center' }}>
            <Inbox size={40} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-secondary)' }}>No Published Grades Found</h3>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Official semester grades have not yet been ratified for your enrolled courses.</p>
          </div>
        ) : (
          <>
            {/* CGPA Summary Cards */}
            <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
              <div className="stat-card">
                <div className="stat-icon-wrapper bg-blue">
                  <Award size={24} className="text-blue" />
                </div>
                <div className="stat-content">
                  <h3>Cumulative GPA</h3>
                  <div className="stat-value-row">
                    <p className="stat-number">{data.cgpa || '0.00'}</p>
                    <span className="trend positive">Scale / 5.0</span>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper bg-emerald">
                  <BookOpen size={24} className="text-emerald" />
                </div>
                <div className="stat-content">
                  <h3>Credits Earned</h3>
                  <div className="stat-value-row">
                    <p className="stat-number">{data.totalCreditsEarned || 0}</p>
                    <span className="trend positive">CU Cleared</span>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper bg-indigo">
                  <TrendingUp size={24} className="text-indigo" />
                </div>
                <div className="stat-content">
                  <h3>Credits Attempted</h3>
                  <div className="stat-value-row">
                    <p className="stat-number">{data.totalCreditsAttempted || 0}</p>
                    <span className="trend neutral">Total Registered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {data.terms.map((term, index) => (
                <div key={index} className="recent-section">
                  <div className="section-header" style={{ marginBottom: '1rem' }}>
                    <div>
                      <h2>{term.termName}</h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Academic Year {term.yearName}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <span className="status-pill status-admitted">GPA: {term.gpa}</span>
                      <span className="status-pill">Earned: {term.creditsEarned} CU</span>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>Course Code</th>
                          <th>Course Title</th>
                          <th>Credits</th>
                          <th>Coursework</th>
                          <th>Exam</th>
                          <th>Total</th>
                          <th>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(term.courses || term.grades || []).map((course) => (
                          <tr key={course.id || course.grade_id}>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>
                                {course.code}
                              </span>
                            </td>
                            <td><strong>{course.name}</strong></td>
                            <td>{course.credits} CU</td>
                            <td>{course.courseworkScore != null ? `${course.courseworkScore}%` : 'N/A'}</td>
                            <td>{course.examScore != null ? `${course.examScore}%` : 'N/A'}</td>
                            <td>
                              <strong>{course.totalScore != null ? `${course.totalScore}%` : 'N/A'}</strong>
                            </td>
                            <td>{getGradeBadge(course.gradeLetter)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
