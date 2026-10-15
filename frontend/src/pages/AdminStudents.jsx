import { useState } from 'react'
import axios from 'axios'
import { Mail } from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'

const API = import.meta.env.VITE_API_URL

export default function AdminStudents() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [viewingStudent, setViewingStudent] = useState(null)
  const [studentDetails, setStudentDetails] = useState(null)

  // Enrollment / course reg state
  const [terms, setTerms] = useState([])
  const [allCourses, setAllCourses] = useState([])
  const [enrollForm, setEnrollForm] = useState({ academic_term_id: '', study_year: 1, study_semester: 1 })
  const [enrollMsg, setEnrollMsg] = useState({ text: '', error: false })

  const [expandedEnrollmentId, setExpandedEnrollmentId] = useState(null)
  const [courseRegistrations, setCourseRegistrations] = useState({}) // keyed by enrollmentId
  const [selectedCourses, setSelectedCourses] = useState([])
  const [regMsg, setRegMsg] = useState({ text: '', error: false })

  const token = localStorage.getItem('adminToken')
  const headers = { Authorization: `Bearer ${token}` }

  const queryParams = {}
  if (statusFilter) queryParams.status = statusFilter
  if (search) queryParams.search = search

  const { data: studentsData, isLoading: loading, refetch: fetchStudents } = useApiQuery('/students', 'adminStudents', {
    axiosOptions: { headers, params: queryParams }
  })
  
  const students = studentsData?.data || []

  const fetchStudentDetails = async (id) => {
    try {
      const [detailsRes, termsRes, coursesRes] = await Promise.all([
        axios.get(`${API}/students/${id}`, { headers }),
        axios.get(`${API}/calendar/terms`, { headers }),
        axios.get(`${API}/course-units`, { headers }),
      ])
      setStudentDetails(detailsRes.data.data)
      setViewingStudent(id)
      setTerms(termsRes.data.data || [])
      setAllCourses(coursesRes.data.data || [])
    } catch (error) {
      alert('Error fetching student details')
    }
  }

  const handleEnroll = async (e) => {
    e.preventDefault()
    setEnrollMsg({ text: '', error: false })
    try {
      await axios.post(`${API}/students/${viewingStudent}/enroll`, enrollForm, { headers })
      setEnrollMsg({ text: 'Student enrolled in term successfully!', error: false })
      // Refresh student details to show new enrollment
      fetchStudentDetails(viewingStudent)
    } catch (err) {
      setEnrollMsg({ text: err.response?.data?.message || 'Failed to enroll.', error: true })
    }
  }

  const toggleCourseRegistrations = async (enrollmentId, programmeId) => {
    if (expandedEnrollmentId === enrollmentId) {
      setExpandedEnrollmentId(null)
      return
    }
    setExpandedEnrollmentId(enrollmentId)
    setSelectedCourses([])
    setRegMsg({ text: '', error: false })
    try {
      const res = await axios.get(`${API}/students/enrollments/${enrollmentId}/courses`, { headers })
      setCourseRegistrations(prev => ({ ...prev, [enrollmentId]: res.data.data }))
    } catch (err) {
      console.error('Failed to load course registrations')
    }
  }

  const handleRegisterCourses = async (enrollmentId) => {
    if (selectedCourses.length === 0) {
      setRegMsg({ text: 'Please select at least one course.', error: true })
      return
    }
    setRegMsg({ text: '', error: false })
    try {
      const res = await axios.post(`${API}/students/enrollments/${enrollmentId}/courses`, { course_ids: selectedCourses }, { headers })
      setRegMsg({ text: res.data.message, error: false })
      setSelectedCourses([])
      // Refresh this enrollment's courses
      const regRes = await axios.get(`${API}/students/enrollments/${enrollmentId}/courses`, { headers })
      setCourseRegistrations(prev => ({ ...prev, [enrollmentId]: regRes.data.data }))
    } catch (err) {
      setRegMsg({ text: err.response?.data?.message || 'Failed to register courses.', error: true })
    }
  }

  const handleRemoveCourseReg = async (registrationId, enrollmentId) => {
    if (!window.confirm('Remove this course registration?')) return
    try {
      await axios.delete(`${API}/students/course-registrations/${registrationId}`, { headers })
      const regRes = await axios.get(`${API}/students/enrollments/${enrollmentId}/courses`, { headers })
      setCourseRegistrations(prev => ({ ...prev, [enrollmentId]: regRes.data.data }))
    } catch (err) {
      alert('Failed to remove registration.')
    }
  }

  const toggleCourseSelection = (courseId) => {
    setSelectedCourses(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    )
  }

  const getStatusBadge = (status) => {
    const badges = {
      active: <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 10px', borderRadius: '99px', fontWeight: 700, fontSize: '0.75rem' }}>Active</span>,
      suspended: <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 10px', borderRadius: '99px', fontWeight: 700, fontSize: '0.75rem' }}>Suspended</span>,
      deferred: <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: '99px', fontWeight: 700, fontSize: '0.75rem' }}>Deferred</span>,
      graduated: <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: '99px', fontWeight: 700, fontSize: '0.75rem' }}>Graduated</span>,
    }
    return badges[status] || <span>{status}</span>
  }

  // Filter courses by student's programme (need to match)
  const programmeCourses = studentDetails
    ? allCourses.filter(c => c.programme_id == studentDetails.profile.programme_id)
    : []

  return (
    <div className="scope-adminstudents admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Student Directory</h1>
        </header>

        {!viewingStudent ? (
          <>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <input
                type="text"
                placeholder="Search name, student number, email..."
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '200px' }}>
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="deferred">Deferred</option>
                <option value="graduated">Graduated</option>
              </select>
            </div>

            {loading ? <p>Loading students...</p> : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Student Number</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Programme</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id}>
                        <td><strong>{s.student_number}</strong></td>
                        <td>{s.first_name} {s.last_name}</td>
                        <td>{s.email}</td>
                        <td>{s.programme_name}</td>
                        <td>{getStatusBadge(s.current_status)}</td>
                        <td>
                          <button className="button button-outline button-sm" onClick={() => fetchStudentDetails(s.id)}>Manage</button>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No students found.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div>
            <button style={{ marginBottom: '1.5rem', background: 'none', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }} onClick={() => { setViewingStudent(null); setStudentDetails(null); setExpandedEnrollmentId(null) }}>
              ← Back to Directory
            </button>
            {studentDetails && (
              <div>
                {/* Profile Header */}
                <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #3730a3)', color: 'white', padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
                  <h2 style={{ margin: '0 0 4px' }}>{studentDetails.profile.first_name} {studentDetails.profile.last_name}</h2>
                  <p style={{ margin: '0 0 8px', opacity: 0.8 }}>{studentDetails.profile.student_number} · {studentDetails.profile.programme_name}</p>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {getStatusBadge(studentDetails.profile.current_status)}
                    <span style={{ opacity: 0.8, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> {studentDetails.profile.email}</span>
                  </div>
                </div>

                {/* Enroll in Term */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '2rem' }}>
                  <h3 style={{ margin: '0 0 1rem', color: '#1e1b4b' }}>Enroll in Academic Term</h3>
                  {enrollMsg.text && (
                    <div style={{ background: enrollMsg.error ? '#fee2e2' : '#d1fae5', color: enrollMsg.error ? '#991b1b' : '#065f46', padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem' }}>
                      {enrollMsg.text}
                    </div>
                  )}
                  <form onSubmit={handleEnroll} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Academic Term *</label>
                      <select value={enrollForm.academic_term_id} onChange={e => setEnrollForm({ ...enrollForm, academic_term_id: e.target.value })} required style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem' }}>
                        <option value="">-- Select Term --</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Study Year</label>
                      <select value={enrollForm.study_year} onChange={e => setEnrollForm({ ...enrollForm, study_year: +e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem' }}>
                        {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Semester</label>
                      <select value={enrollForm.study_semester} onChange={e => setEnrollForm({ ...enrollForm, study_semester: +e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem' }}>
                        <option value={1}>Sem 1</option>
                        <option value={2}>Sem 2</option>
                      </select>
                    </div>
                    <button type="submit" style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>Enroll</button>
                  </form>
                </div>

                {/* Term Enrollments + Course Registrations */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '2rem' }}>
                  <h3 style={{ margin: '0 0 1rem', color: '#1e1b4b' }}>Term Enrollments & Course Registrations</h3>
                  {studentDetails.enrollments.length === 0 ? (
                    <p style={{ color: '#9ca3af', textAlign: 'center', padding: '1.5rem 0' }}>No term enrollments yet. Use the form above to enroll this student.</p>
                  ) : (
                    studentDetails.enrollments.map(enr => (
                      <div key={enr.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '1rem', overflow: 'hidden' }}>
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f8fafc', cursor: 'pointer' }}
                          onClick={() => toggleCourseRegistrations(enr.id, studentDetails.profile.programme_id)}
                        >
                          <div>
                            <strong style={{ color: '#1e1b4b' }}>{enr.term_name}</strong>
                            <span style={{ color: '#64748b', marginLeft: '12px', fontSize: '0.875rem' }}>Year {enr.study_year} · Sem {enr.study_semester} · {enr.year_name}</span>
                            <span style={{ marginLeft: '12px', background: enr.progression_status === 'normal' ? '#d1fae5' : '#f1f5f9', color: enr.progression_status === 'normal' ? '#065f46' : '#64748b', padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700 }}>{enr.progression_status}</span>
                          </div>
                          <span style={{ color: '#6366f1', fontSize: '0.8rem', fontWeight: 600 }}>{expandedEnrollmentId === enr.id ? '▲ Hide Courses' : '▼ Manage Courses'}</span>
                        </div>

                        {expandedEnrollmentId === enr.id && (
                          <div style={{ padding: '16px 18px' }}>
                            {/* Registered Courses */}
                            <p style={{ fontWeight: 700, color: '#374151', marginBottom: '8px', fontSize: '0.875rem' }}>Registered Courses:</p>
                            {(courseRegistrations[enr.id] || []).length === 0 ? (
                              <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1rem' }}>No courses registered yet.</p>
                            ) : (
                              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                <thead>
                                  <tr style={{ background: '#f1f5f9' }}>
                                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Code</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Course Name</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Credits</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {courseRegistrations[enr.id].map(cr => (
                                    <tr key={cr.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{cr.course_code}</td>
                                      <td style={{ padding: '8px 12px', color: '#1e293b' }}>{cr.course_name}</td>
                                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{cr.credits}</td>
                                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                        <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700 }}>{cr.status}</span>
                                      </td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                        <button onClick={() => handleRemoveCourseReg(cr.id, enr.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Remove</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}

                            {/* Add Courses */}
                            {regMsg.text && (
                              <div style={{ background: regMsg.error ? '#fee2e2' : '#d1fae5', color: regMsg.error ? '#991b1b' : '#065f46', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px', fontSize: '0.875rem' }}>
                                {regMsg.text}
                              </div>
                            )}
                            <p style={{ fontWeight: 700, color: '#374151', marginBottom: '8px', fontSize: '0.875rem' }}>Add Courses from Programme:</p>
                            {programmeCourses.length === 0 ? (
                              <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>No courses found for this programme. Add them in Programmes → Course Units.</p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                                {programmeCourses.map(c => {
                                  const alreadyRegistered = (courseRegistrations[enr.id] || []).some(cr => cr.course_code === c.course_code)
                                  const isSelected = selectedCourses.includes(c.id)
                                  return (
                                    <label
                                      key={c.id}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                                        border: `1.5px solid ${alreadyRegistered ? '#e2e8f0' : isSelected ? '#6366f1' : '#e2e8f0'}`,
                                        borderRadius: '8px', cursor: alreadyRegistered ? 'not-allowed' : 'pointer',
                                        background: alreadyRegistered ? '#f8fafc' : isSelected ? '#eef2ff' : 'white',
                                        opacity: alreadyRegistered ? 0.6 : 1, fontSize: '0.8rem'
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        disabled={alreadyRegistered}
                                        onChange={() => !alreadyRegistered && toggleCourseSelection(c.id)}
                                      />
                                      <span>
                                        <strong style={{ color: '#6366f1' }}>{c.course_code}</strong>
                                        <span style={{ color: '#374151', marginLeft: '4px' }}>{c.name}</span>
                                        {alreadyRegistered && <span style={{ color: '#10b981', marginLeft: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Enrolled</span>}
                                      </span>
                                    </label>
                                  )
                                })}
                              </div>
                            )}
                            <button
                              onClick={() => handleRegisterCourses(enr.id)}
                              disabled={selectedCourses.length === 0}
                              style={{ background: selectedCourses.length > 0 ? '#4f46e5' : '#e2e8f0', color: selectedCourses.length > 0 ? 'white' : '#9ca3af', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: selectedCourses.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '0.875rem' }}
                            >
                              Register {selectedCourses.length > 0 ? `${selectedCourses.length} Course(s)` : 'Courses'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Financial Ledger */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                  <h3 style={{ margin: '0 0 1rem', color: '#1e1b4b' }}>Financial Ledger (Invoices)</h3>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Term</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentDetails.invoices.map(i => (
                        <tr key={i.id}>
                          <td>{new Date(i.created_at).toLocaleDateString()}</td>
                          <td>{i.term_name}</td>
                          <td>{i.description} ({i.fee_type})</td>
                          <td>{i.currency} {Number(i.amount).toLocaleString()}</td>
                          <td>{i.status}</td>
                        </tr>
                      ))}
                      {studentDetails.invoices.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>No invoices found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
