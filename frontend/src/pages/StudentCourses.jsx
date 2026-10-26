import { useState } from 'react'
import StudentSidebar from '../components/StudentSidebar'
import { useApiQuery } from '../hooks/useApiQuery'
import { BookOpen, FileText, Video, Download, Inbox, Layers } from 'lucide-react'
import './AdminDashboard.css'

const API = import.meta.env.VITE_API_URL

export default function StudentCourses() {
  const [activeTab, setActiveTab] = useState('enrolled')

  const token = localStorage.getItem('studentToken')
  const { data: enrollRes, isLoading: enrollLoading, error: enrollError } = useApiQuery(`${API}/student-profile/enrollments`, 'studentEnrollments', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })
  const { data: materialsRes, isLoading: materialsLoading, error: materialsError } = useApiQuery(`${API}/student-profile/materials`, 'studentMaterials', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const enrollments = enrollRes?.data || []
  const materials = materialsRes?.data || {}
  const isLoading = enrollLoading || materialsLoading
  const error = enrollError || materialsError

  const getFileIcon = (type) => {
    if (type === 'pdf') return <FileText size={20} className="text-blue" />
    if (type === 'video') return <Video size={20} className="text-indigo" />
    return <FileText size={20} className="text-blue" />
  }

  return (
    <div className="scope-studentcourses scope-admindashboard admin-layout">
      <StudentSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)' }}>
        <header className="content-header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-secondary)', margin: '0 0 0.25rem 0' }}>Registered Courses</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Active course units and academic learning materials</p>
        </header>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.75rem' }}>
          <button
            onClick={() => setActiveTab('enrolled')}
            className={`btn-text ${activeTab === 'enrolled' ? 'active' : ''}`}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: activeTab === 'enrolled' ? '1px solid var(--color-primary)' : '1px solid rgba(0,0,0,0.08)',
              background: activeTab === 'enrolled' ? 'var(--color-primary)' : 'white',
              color: activeTab === 'enrolled' ? 'white' : 'var(--color-text)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <BookOpen size={16} /> Course Units ({enrollments.length})
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`btn-text ${activeTab === 'materials' ? 'active' : ''}`}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: activeTab === 'materials' ? '1px solid var(--color-primary)' : '1px solid rgba(0,0,0,0.08)',
              background: activeTab === 'materials' ? 'var(--color-primary)' : 'white',
              color: activeTab === 'materials' ? 'white' : 'var(--color-text)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={16} /> Course Materials
          </button>
        </div>

        {error && <div className="message-error" style={{ marginBottom: '1.5rem' }}>Unable to load courses or learning materials.</div>}

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading course information...</p>
          </div>
        ) : (
          <>
            {activeTab === 'enrolled' && (
              <div className="recent-section">
                {enrollments.length === 0 ? (
                  <div className="empty-state" style={{ padding: '3.5rem', background: 'white', borderRadius: '16px', textAlign: 'center' }}>
                    <Inbox size={40} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-secondary)' }}>No Course Registrations</h3>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>You are not officially registered for any course units in the current term.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Course Name &amp; Syllabus</th>
                          <th>Academic Term</th>
                          <th>Credit Units</th>
                          <th>Type</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map(enr => (
                          <tr key={enr.registration_id}>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>
                                {enr.course_code}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{enr.course_name}</div>
                              {enr.modules && enr.modules.length > 0 && (
                                <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                  <strong style={{ color: '#475569' }}>Key Modules:</strong> {enr.modules.join(', ')}
                                </div>
                              )}
                            </td>
                            <td>{enr.term_name}</td>
                            <td><strong>{enr.credits} CU</strong></td>
                            <td>
                              <span className="status-pill status-admitted" style={{ textTransform: 'capitalize' }}>
                                {enr.registration_type || 'Normal'}
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill status-${enr.registration_status === 'active' ? 'admitted' : 'pending'}`} style={{ textTransform: 'capitalize' }}>
                                {enr.registration_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="recent-section">
                {Object.keys(materials).length === 0 ? (
                  <div className="empty-state" style={{ padding: '3.5rem', background: 'white', borderRadius: '16px', textAlign: 'center' }}>
                    <Inbox size={40} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-secondary)' }}>No Course Materials Published</h3>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Lecture slides and course resources will appear here once uploaded by your lecturers.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {Object.values(materials).map((courseGroup) => (
                      <div key={courseGroup.course_id} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                          <span className="programme-tag" style={{ margin: 0 }}>{courseGroup.course_code}</span>
                          <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-secondary)' }}>
                            {courseGroup.course_name}
                          </h3>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                          {courseGroup.materials.map(mat => (
                            <div key={mat.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', background: '#fafafa' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                                <div className="stat-icon-wrapper bg-blue" style={{ width: '40px', height: '40px', borderRadius: '8px' }}>
                                  {getFileIcon(mat.file_type)}
                                </div>
                                <div>
                                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', color: 'var(--color-text)' }}>{mat.title}</h4>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                    {new Date(mat.uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                              {mat.description && (
                                <p style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '1rem', flex: 1, lineHeight: 1.4 }}>
                                  {mat.description}
                                </p>
                              )}
                              <a 
                                href={mat.url} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ 
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  background: 'var(--color-primary)', 
                                  color: 'white', 
                                  padding: '8px 12px', 
                                  borderRadius: '8px', 
                                  fontWeight: 600, 
                                  fontSize: '0.85rem',
                                  textDecoration: 'none', 
                                  marginTop: 'auto'
                                }}
                              >
                                <Download size={14} /> Access Resource
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
