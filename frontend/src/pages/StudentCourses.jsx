import { useState } from 'react'
import StudentSidebar from '../components/StudentSidebar'
import { useApiQuery } from '../hooks/useApiQuery'

const API = import.meta.env.VITE_API_URL

export default function StudentCourses() {
  const [activeTab, setActiveTab] = useState('enrolled')

  const token = localStorage.getItem('studentToken')
  const { data: enrollRes, isLoading: enrollLoading, error: enrollError } = useApiQuery(`${API}/student-profile/enrollments`, {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })
  const { data: materialsRes, isLoading: materialsLoading, error: materialsError } = useApiQuery(`${API}/student-profile/materials`, {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const enrollments = enrollRes?.data || []
  const materials = materialsRes?.data || {}
  const isLoading = enrollLoading || materialsLoading
  const error = enrollError || materialsError

  return (
    <div className="scope-studentcourses admin-layout">
      <StudentSidebar />
      <main className="admin-content student-dashboard-main">
        <div style={{ padding: '24px' }}>
          <header style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.8rem', color: '#1e1b4b', marginBottom: '8px' }}>My Courses</h2>
            <p style={{ color: '#6b7280' }}>View your officially registered courses and access learning materials.</p>
          </header>

          <div className="tabs" style={{ display: 'flex', gap: '20px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb' }}>
            <button 
              className={`tab ${activeTab === 'enrolled' ? 'active' : ''}`}
              onClick={() => setActiveTab('enrolled')}
              style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'enrolled' ? '2px solid #6366f1' : 'none', color: activeTab === 'enrolled' ? '#6366f1' : '#64748b', fontWeight: activeTab === 'enrolled' ? '600' : '500', cursor: 'pointer', marginBottom: '-2px' }}
            >
              Enrolled Courses
            </button>
            <button 
              className={`tab ${activeTab === 'materials' ? 'active' : ''}`}
              onClick={() => setActiveTab('materials')}
              style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'materials' ? '2px solid #6366f1' : 'none', color: activeTab === 'materials' ? '#6366f1' : '#64748b', fontWeight: activeTab === 'materials' ? '600' : '500', cursor: 'pointer', marginBottom: '-2px' }}
            >
              Course Materials
            </button>
          </div>

          {error && <div className="message-error">Failed to load your courses or materials.</div>}

          {isLoading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <>
              {activeTab === 'enrolled' && (
                <div className="table-responsive">
                  {enrollments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                      <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>📚</span>
                      <h3 style={{ color: '#1e1b4b', marginBottom: '8px' }}>No Courses Registered</h3>
                      <p style={{ color: '#6b7280' }}>You are not currently registered for any courses this term.</p>
                    </div>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Course Code</th>
                          <th>Course Name</th>
                          <th>Term</th>
                          <th>Credits</th>
                          <th>Type</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map(enr => (
                          <tr key={enr.registration_id}>
                            <td style={{ fontWeight: 600 }}>{enr.course_code}</td>
                            <td>
                              <div style={{ fontWeight: 500, color: '#1e293b' }}>{enr.course_name}</div>
                              {enr.modules && enr.modules.length > 0 && (
                                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                  <strong style={{ color: '#475569' }}>Syllabus Topics:</strong>
                                  <ul style={{ paddingLeft: '16px', margin: '4px 0 0 0' }}>
                                    {enr.modules.map((mod, idx) => (
                                      <li key={idx} style={{ marginBottom: '2px' }}>{mod}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </td>
                            <td>{enr.term_name}</td>
                            <td>{enr.credits}</td>
                            <td>
                              {enr.registration_type === 'retake' ? (
                                <span style={{ fontSize: '0.8rem', background: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px' }}>Retake</span>
                              ) : (
                                <span style={{ fontSize: '0.8rem', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px' }}>Normal</span>
                              )}
                            </td>
                            <td>
                              <span style={{ 
                                fontSize: '0.8rem', 
                                background: enr.registration_status === 'active' ? '#dcfce7' : '#fee2e2', 
                                color: enr.registration_status === 'active' ? '#166534' : '#991b1b', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                textTransform: 'capitalize'
                              }}>
                                {enr.registration_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'materials' && (
                <div className="materials-container">
                  {Object.keys(materials).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                      <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>📄</span>
                      <h3 style={{ color: '#1e1b4b', marginBottom: '8px' }}>No Materials Found</h3>
                      <p style={{ color: '#6b7280' }}>No materials have been uploaded by your lecturers yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '20px' }}>
                      {Object.values(materials).map((courseGroup) => (
                        <div key={courseGroup.course_id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
                          <h3 style={{ margin: '0 0 16px', color: '#1e1b4b', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                            <span style={{ color: '#6366f1', marginRight: '8px' }}>{courseGroup.course_code}</span> 
                            {courseGroup.course_name}
                          </h3>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                            {courseGroup.materials.map(mat => (
                              <div key={mat.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                  <div style={{ width: '40px', height: '40px', background: '#eef2ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                    {mat.file_type === 'pdf' ? '📕' : mat.file_type === 'video' ? '🎬' : '📄'}
                                  </div>
                                  <div>
                                    <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#1e293b' }}>{mat.title}</h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                                      {new Date(mat.uploaded_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '16px', flex: 1 }}>{mat.description}</p>
                                <a 
                                  href={mat.url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{ display: 'block', textAlign: 'center', background: '#f8fafc', color: '#4f46e5', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '6px', fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' }}
                                  onMouseOver={e => { e.currentTarget.style.background = '#4f46e5'; e.currentTarget.style.color = 'white' }}
                                  onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#4f46e5' }}
                                >
                                  Open / Download
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
        </div>
      </main>
    </div>
  )
}
