import { useApiQuery } from '../hooks/useApiQuery'
import StudentSidebar from '../components/StudentSidebar'
import './StudentResults.css'

export default function StudentResults() {
  const token = localStorage.getItem('studentToken')
  const { data: resData, isLoading, error: apiError } = useApiQuery(`${import.meta.env.VITE_API_URL}/student-profile/results`, 'studentResults', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const data = resData?.data
  const error = apiError ? 'Could not load your academic results. Please try again later.' : ''

  const getGradeColor = (letter) => {
    switch(letter) {
      case 'A': return '#22c55e' // Green
      case 'B': return '#3b82f6' // Blue
      case 'C': return '#eab308' // Yellow
      case 'D': return '#f97316' // Orange
      case 'F': return '#ef4444' // Red
      default: return '#888'
    }
  }

  return (
    <div className="scope-studentresults admin-layout">
      <StudentSidebar />
      <main className="admin-content student-dashboard-main">
        <div className="results-container">
          <header className="results-header">
            <div>
              <h2>Academic Results & Transcript</h2>
              <p className="text-muted">View your cumulative performance and semester-by-semester grades.</p>
            </div>
            <button className="btn-primary" onClick={() => window.print()}>
              🖨️ Print Transcript
            </button>
          </header>

          {isLoading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : error ? (
            <div className="message-error">{error}</div>
          ) : !data || data.terms.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🎓</span>
              <h3>No Results Found</h3>
              <p className="text-muted">You do not have any published grades yet.</p>
            </div>
          ) : (
            <>
              {/* CGPA Summary Cards */}
              <div className="summary-cards">
                <div className="summary-card cgpa-card">
                  <span className="summary-label">Cumulative GPA</span>
                  <span className="summary-value">{data.cgpa} <small>/ 5.0</small></span>
                </div>
                <div className="summary-card">
                  <span className="summary-label">Credits Earned</span>
                  <span className="summary-value">{data.totalCreditsEarned} <small>cr</small></span>
                </div>
                <div className="summary-card">
                  <span className="summary-label">Credits Attempted</span>
                  <span className="summary-value">{data.totalCreditsAttempted} <small>cr</small></span>
                </div>
              </div>

              {/* Term by Term Breakdown */}
              <div className="terms-list">
                {data.terms.map((term, index) => (
                  <div key={index} className="term-section">
                    <h3 className="term-title">
                      Year {term.study_year} — {term.term_name}
                    </h3>
                    <div className="table-responsive">
                      <table className="results-table">
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Course Name</th>
                            <th className="text-center">Credits</th>
                            <th className="text-center">Coursework (Out of 40)</th>
                            <th className="text-center">Exam (Out of 60)</th>
                            <th className="text-center">Final Score</th>
                            <th className="text-center">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {term.grades.map(grade => (
                            <tr key={grade.grade_id}>
                              <td className="course-code">{grade.course_code}</td>
                              <td className="course-name">{grade.course_name}</td>
                              <td className="text-center">{grade.credits}</td>
                              <td className="text-center">{grade.coursework_mark ?? '-'}</td>
                              <td className="text-center">{grade.exam_mark ?? '-'}</td>
                              <td className="text-center font-bold">{grade.final_score ?? '-'}</td>
                              <td className="text-center">
                                <span 
                                  className="grade-badge" 
                                  style={{ backgroundColor: getGradeColor(grade.grade_letter) }}
                                >
                                  {grade.grade_letter}
                                </span>
                              </td>
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
        </div>
      </main>
    </div>
  )
}
