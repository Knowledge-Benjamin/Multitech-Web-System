import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, CheckCircle2, ChevronDown,
  ChevronRight, CircleAlert, CreditCard, GraduationCap, Mail, Phone,
  Receipt, Search, Trash2, UserRound, Users, X
} from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'
import './AdminStudents.css'

const API = import.meta.env.VITE_API_URL
const STATUS_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'graduated', label: 'Graduated' }
]

const formatDate = (value) => {
  if (!value) return 'Not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not provided'
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatMoney = (currency, amount) => (
  `${currency || 'UGX'} ${Number(amount || 0).toLocaleString('en-UG', { maximumFractionDigits: 2 })}`
)

const getInitials = (firstName, lastName) => (
  `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'ST'
)

function StudentAvatar({ photoUrl, firstName, lastName, className }) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [photoUrl])

  return (
    <span className={className}>
      {photoUrl && !imageFailed
        ? <img src={photoUrl} alt="" onError={() => setImageFailed(true)} />
        : getInitials(firstName, lastName)}
    </span>
  )
}

const summarizeFinancials = (invoices = [], payments = []) => {
  const totals = {}
  invoices.forEach((invoice) => {
    if (invoice.status === 'void') return
    const currency = invoice.currency || 'UGX'
    totals[currency] = totals[currency] || { billed: 0, paid: 0 }
    totals[currency].billed += Number(invoice.amount) || 0
  })
  payments.forEach((payment) => {
    const currency = payment.currency || 'UGX'
    totals[currency] = totals[currency] || { billed: 0, paid: 0 }
    totals[currency].paid += Number(payment.amount) || 0
  })
  return Object.entries(totals).map(([currency, values]) => ({
    currency,
    ...values,
    balance: values.billed - values.paid
  }))
}

const getRequestError = (error, fallback) => (
  error.response?.data?.message || fallback
)

export default function AdminStudents() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [viewingStudent, setViewingStudent] = useState(null)
  const [studentDetails, setStudentDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [terms, setTerms] = useState([])
  const [allCourses, setAllCourses] = useState([])
  const [enrollForm, setEnrollForm] = useState({ academic_term_id: '', study_year: 1, study_semester: 1 })
  const [enrollMsg, setEnrollMsg] = useState({ text: '', error: false })
  const [enrolling, setEnrolling] = useState(false)
  const [expandedEnrollmentId, setExpandedEnrollmentId] = useState(null)
  const [courseRegistrations, setCourseRegistrations] = useState({})
  const [registrationsLoading, setRegistrationsLoading] = useState({})
  const [selectedCourses, setSelectedCourses] = useState([])
  const [regMsg, setRegMsg] = useState({ text: '', error: false })
  const [courseRemoval, setCourseRemoval] = useState(null)
  const [removingCourse, setRemovingCourse] = useState(false)
  const [removalError, setRemovalError] = useState('')

  const token = localStorage.getItem('adminToken')
  const headers = { Authorization: `Bearer ${token}` }
  const queryParams = { page, limit: pageSize }
  if (statusFilter) queryParams.status = statusFilter
  if (search.trim()) queryParams.search = search.trim()

  const {
    data: studentsData,
    isLoading: loading,
    isFetching,
    error: studentsError,
    refetch: fetchStudents
  } = useApiQuery('/students', 'adminStudents', {
    axiosOptions: { headers, params: queryParams }
  })
  const students = studentsData?.data || []
  const pagination = studentsData?.pagination || { page, limit: pageSize, total: 0, totalPages: 0 }
  const statusCounts = studentsData?.statusCounts || {}
  const allStudentsCount = Object.values(statusCounts).reduce((total, count) => total + Number(count || 0), 0)
  const profile = studentDetails?.profile
  const programmeCourses = profile
    ? allCourses.filter(course => String(course.programme_id) === String(profile.programme_id))
    : []
  const financialSummary = studentDetails
    ? summarizeFinancials(studentDetails.invoices, studentDetails.payments)
    : []

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, pageSize])

  useEffect(() => {
    if (!courseRemoval) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !removingCourse) setCourseRemoval(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [courseRemoval, removingCourse])

  const fetchStudentDetails = async (id) => {
    setViewingStudent(id)
    setStudentDetails(null)
    setDetailsError('')
    setDetailsLoading(true)
    setTerms([])
    setAllCourses([])
    setCourseRegistrations({})
    setExpandedEnrollmentId(null)
    setEnrollMsg({ text: '', error: false })

    try {
      const [detailsRes, termsRes, coursesRes] = await Promise.all([
        axios.get(`${API}/students/${id}`, { headers }),
        axios.get(`${API}/calendar/terms`, { headers }),
        axios.get(`${API}/course-units`, { headers })
      ])
      setStudentDetails(detailsRes.data.data)
      setTerms(termsRes.data.data || [])
      setAllCourses(coursesRes.data.data || [])
    } catch (error) {
      setDetailsError(getRequestError(error, 'Student details could not be loaded. Please try again.'))
    } finally {
      setDetailsLoading(false)
    }
  }

  const returnToDirectory = () => {
    setViewingStudent(null)
    setStudentDetails(null)
    setDetailsError('')
    setExpandedEnrollmentId(null)
    setCourseRemoval(null)
  }

  const handleEnroll = async (event) => {
    event.preventDefault()
    setEnrollMsg({ text: '', error: false })
    setEnrolling(true)
    try {
      const response = await axios.post(`${API}/students/${viewingStudent}/enroll`, enrollForm, { headers })
      await fetchStudentDetails(viewingStudent)
      setEnrollMsg({ text: response.data.message || 'Student enrolled in this term.', error: false })
    } catch (error) {
      setEnrollMsg({ text: getRequestError(error, 'Unable to enroll the student in this term.'), error: true })
    } finally {
      setEnrolling(false)
    }
  }

  const toggleCourseRegistrations = async (enrollmentId) => {
    if (expandedEnrollmentId === enrollmentId) {
      setExpandedEnrollmentId(null)
      return
    }
    setExpandedEnrollmentId(enrollmentId)
    setSelectedCourses([])
    setRegMsg({ text: '', error: false })
    if (courseRegistrations[enrollmentId]) return

    setRegistrationsLoading(previous => ({ ...previous, [enrollmentId]: true }))
    try {
      const response = await axios.get(`${API}/students/enrollments/${enrollmentId}/courses`, { headers })
      setCourseRegistrations(previous => ({ ...previous, [enrollmentId]: response.data.data || [] }))
    } catch (error) {
      setRegMsg({ text: getRequestError(error, 'Course registrations could not be loaded.'), error: true })
    } finally {
      setRegistrationsLoading(previous => ({ ...previous, [enrollmentId]: false }))
    }
  }

  const handleRegisterCourses = async (enrollmentId) => {
    if (selectedCourses.length === 0) {
      setRegMsg({ text: 'Select at least one course to continue.', error: true })
      return
    }
    setRegMsg({ text: '', error: false })
    try {
      const response = await axios.post(
        `${API}/students/enrollments/${enrollmentId}/courses`,
        { course_ids: selectedCourses },
        { headers }
      )
      setRegMsg({ text: response.data.message || 'Course registrations saved.', error: false })
      setSelectedCourses([])
      const registrationsResponse = await axios.get(`${API}/students/enrollments/${enrollmentId}/courses`, { headers })
      setCourseRegistrations(previous => ({
        ...previous,
        [enrollmentId]: registrationsResponse.data.data || []
      }))
    } catch (error) {
      setRegMsg({
        text: getRequestError(error, 'Course registration was submitted, but the latest records could not be loaded. Refresh the section to verify.'),
        error: true
      })
    }
  }

  const handleRemoveCourseReg = async () => {
    if (!courseRemoval) return
    setRemovingCourse(true)
    setRemovalError('')
    try {
      await axios.delete(`${API}/students/course-registrations/${courseRemoval.registrationId}`, { headers })
      const response = await axios.get(
        `${API}/students/enrollments/${courseRemoval.enrollmentId}/courses`,
        { headers }
      )
      setCourseRegistrations(previous => ({
        ...previous,
        [courseRemoval.enrollmentId]: response.data.data || []
      }))
      setCourseRemoval(null)
    } catch (error) {
      setRemovalError(getRequestError(error, 'Unable to remove the course registration.'))
    } finally {
      setRemovingCourse(false)
    }
  }

  const toggleCourseSelection = (courseId) => {
    setSelectedCourses(previous => (
      previous.includes(courseId)
        ? previous.filter(id => id !== courseId)
        : [...previous, courseId]
    ))
  }

  const renderStatus = (status) => (
    <span className={`student-status student-status--${String(status || 'unknown').toLowerCase()}`}>
      {status || 'Status not recorded'}
    </span>
  )

  return (
    <div className="scope-adminstudents admin-layout">
      <AdminSidebar />
      <main className="admin-content admin-students-content">
        {!viewingStudent ? (
          <>
            <header className="students-page-header">
              <div>
                <p className="students-eyebrow">People &amp; records</p>
                <h1>Students</h1>
                <p className="students-page-intro">
                  Find a student, review their academic record, and manage term and course registration.
                </p>
              </div>
              <div className="students-header-count">
                <Users size={18} />
                <span>{allStudentsCount.toLocaleString()} student records</span>
              </div>
            </header>

            <section className="students-stat-grid" aria-label="Student status totals">
              <button
                type="button"
                className={`students-stat-card ${statusFilter === '' ? 'is-selected' : ''}`}
                onClick={() => setStatusFilter('')}
                aria-pressed={!statusFilter}
              >
                <span className="students-stat-icon"><Users size={18} /></span>
                <span className="students-stat-label">All students</span>
                <strong>{allStudentsCount.toLocaleString()}</strong>
              </button>
              {STATUS_FILTERS.map(item => (
                <button
                  type="button"
                  key={item.value}
                  className={`students-stat-card ${statusFilter === item.value ? 'is-selected' : ''}`}
                  onClick={() => setStatusFilter(statusFilter === item.value ? '' : item.value)}
                  aria-pressed={statusFilter === item.value}
                >
                  <span className={`students-stat-icon students-stat-icon--${item.value}`}>
                    <GraduationCap size={18} />
                  </span>
                  <span className="students-stat-label">{item.label}</span>
                  <strong>{Number(statusCounts[item.value] || 0).toLocaleString()}</strong>
                </button>
              ))}
            </section>

            <section className="students-directory-card">
              <div className="students-directory-heading">
                <div>
                  <h2>Student directory</h2>
                  <p>Search by name, student number, or account email.</p>
                </div>
                <button
                  type="button"
                  className="students-refresh-button"
                  onClick={() => fetchStudents()}
                  disabled={isFetching}
                >
                  <span aria-hidden="true">↻</span>
                  {isFetching ? 'Refreshing' : 'Refresh'}
                </button>
              </div>

              <div className="students-filters">
                <label className="students-search">
                  <Search size={17} aria-hidden="true" />
                  <span className="visually-hidden">Search students</span>
                  <input
                    type="search"
                    placeholder="Search students..."
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                  />
                </label>
                <label className="students-status-filter">
                  <span className="visually-hidden">Filter by student status</span>
                  <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                    <option value="">All statuses</option>
                    {STATUS_FILTERS.map(item => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              {studentsError ? (
                <div className="students-feedback students-feedback--error" role="alert">
                  <CircleAlert size={18} />
                  <span>Student records could not be loaded. Check your connection and try again.</span>
                  <button type="button" onClick={() => fetchStudents()}>Retry</button>
                </div>
              ) : loading ? (
                <div className="students-loading" role="status">Loading student records…</div>
              ) : students.length === 0 ? (
                <div className="students-empty-state">
                  <div className="students-empty-icon"><Users size={22} /></div>
                  <h3>No students found</h3>
                  <p>{search || statusFilter ? 'Try adjusting your search or filters.' : 'Student records will appear here when available.'}</p>
                  {(search || statusFilter) && (
                    <button type="button" className="students-link-button" onClick={() => { setSearch(''); setStatusFilter('') }}>
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="students-table-wrap">
                    <table className="students-table">
                      <thead>
                        <tr>
                          <th scope="col">Student</th>
                          <th scope="col">Programme &amp; term</th>
                          <th scope="col">Contact</th>
                          <th scope="col">Status</th>
                          <th scope="col"><span className="visually-hidden">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(student => (
                          <tr key={student.id}>
                            <td>
                              <div className="students-identity">
                                <StudentAvatar
                                  className="students-avatar"
                                  photoUrl={student.passport_photo_url}
                                  firstName={student.first_name}
                                  lastName={student.last_name}
                                />
                                <span className="students-identity-copy">
                                  <strong>{student.first_name} {student.last_name}</strong>
                                  <span>{student.student_number || 'Student number not recorded'}</span>
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="students-programme">{student.programme_name}</span>
                              <span className="students-table-subtext">
                                {student.current_term_name
                                  ? `${student.current_term_name}${student.current_study_year ? ` · Year ${student.current_study_year}` : ''}${student.current_study_semester ? ` · Semester ${student.current_study_semester}` : ''}`
                                  : 'No term enrollment'}
                              </span>
                            </td>
                            <td>
                              <a className="students-email-link" href={`mailto:${student.email}`}>
                                {student.email}
                              </a>
                              {student.phone && <span className="students-table-subtext">{student.phone}</span>}
                            </td>
                            <td>{renderStatus(student.current_status)}</td>
                            <td className="students-action-cell">
                              <button
                                type="button"
                                className="students-manage-button"
                                onClick={() => fetchStudentDetails(student.id)}
                              >
                                View record <ArrowRight size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <footer className="students-pagination">
                    <span>
                      Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </span>
                    <div className="students-pagination-controls">
                      <label>
                        <span className="visually-hidden">Rows per page</span>
                        <select value={pageSize} onChange={event => setPageSize(Number(event.target.value))}>
                          {[10, 25, 50].map(size => <option key={size} value={size}>{size} per page</option>)}
                        </select>
                      </label>
                      <span className="students-page-number">
                        Page {pagination.page || page} of {pagination.totalPages || 1}
                      </span>
                      <button
                        type="button"
                        aria-label="Previous page"
                        disabled={!pagination.hasPreviousPage}
                        onClick={() => setPage(current => Math.max(1, current - 1))}
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="Next page"
                        disabled={!pagination.hasNextPage}
                        onClick={() => setPage(current => current + 1)}
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </footer>
                </>
              )}
            </section>
          </>
        ) : (
          <section className="student-record-view">
            <button type="button" className="students-back-button" onClick={returnToDirectory}>
              <ArrowLeft size={16} /> Back to students
            </button>

            {detailsLoading ? (
              <div className="students-loading students-detail-loading" role="status">Loading student record…</div>
            ) : detailsError ? (
              <div className="students-feedback students-feedback--error" role="alert">
                <CircleAlert size={18} />
                <span>{detailsError}</span>
                <button type="button" onClick={() => fetchStudentDetails(viewingStudent)}>Retry</button>
              </div>
            ) : profile && (
              <>
                <header className="student-profile-hero">
                  <div className="student-profile-identity">
                    <StudentAvatar
                      className="student-profile-avatar"
                      photoUrl={profile.passport_photo_url}
                      firstName={profile.first_name}
                      lastName={profile.last_name}
                    />
                    <div>
                      <p className="students-eyebrow">Student record</p>
                      <h1>{profile.first_name} {profile.last_name}</h1>
                      <p className="student-profile-meta">
                        <span>{profile.student_number}</span>
                        <span>{profile.programme_name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="student-profile-status">{renderStatus(profile.current_status)}</div>
                  <div className="student-profile-contact">
                    {profile.email && <a href={`mailto:${profile.email}`}><Mail size={15} />{profile.email}</a>}
                    {profile.phone && <a href={`tel:${profile.phone}`}><Phone size={15} />{profile.phone}</a>}
                  </div>
                </header>

                <div className="student-summary-grid" aria-label="Student record summary">
                  <article className="student-summary-card">
                    <span className="student-summary-icon"><CalendarDays size={18} /></span>
                    <span className="student-summary-label">Term enrollments</span>
                    <strong>{studentDetails.enrollments.length}</strong>
                    <span className="student-summary-note">
                      {studentDetails.enrollments[0]?.term_name || 'No term enrollment'}
                    </span>
                  </article>
                  <article className="student-summary-card">
                    <span className="student-summary-icon"><CheckCircle2 size={18} /></span>
                    <span className="student-summary-label">Attendance</span>
                    <strong>
                      {studentDetails.attendanceSummary.percentage == null
                        ? 'No records'
                        : `${studentDetails.attendanceSummary.percentage}%`}
                    </strong>
                    <span className="student-summary-note">
                      {studentDetails.attendanceSummary.totalSessions
                        ? `${studentDetails.attendanceSummary.attendedSessions} of ${studentDetails.attendanceSummary.totalSessions} completed sessions`
                        : 'No completed sessions'}
                    </span>
                  </article>
                  <article className="student-summary-card">
                    <span className="student-summary-icon"><GraduationCap size={18} /></span>
                    <span className="student-summary-label">Academic results</span>
                    <strong>
                      {studentDetails.academicSummary.cgpa == null
                        ? 'No grades'
                        : `${studentDetails.academicSummary.cgpa} CGPA`}
                    </strong>
                    <span className="student-summary-note">
                      {studentDetails.academicSummary.gradeRecords
                        ? `${studentDetails.academicSummary.gradeRecords} graded course records`
                        : 'No grade records'}
                    </span>
                  </article>
                  {financialSummary.map(item => (
                    <article className="student-summary-card" key={item.currency}>
                      <span className="student-summary-icon student-summary-icon--finance"><CreditCard size={18} /></span>
                      <span className="student-summary-label">Financial balance · {item.currency}</span>
                      <strong>{formatMoney(item.currency, Math.abs(item.balance))}</strong>
                      <span className="student-summary-note">
                        {item.balance > 0 ? 'Outstanding' : item.balance < 0 ? 'Credit balance' : 'Settled'}
                      </span>
                    </article>
                  ))}
                </div>

                <section className="student-record-card">
                  <div className="student-section-heading">
                    <div className="student-section-icon"><UserRound size={18} /></div>
                    <div>
                      <h2>Profile information</h2>
                      <p>Personal and contact details on the student account.</p>
                    </div>
                  </div>
                  <dl className="student-profile-fields">
                    <div><dt>Gender</dt><dd>{profile.gender || 'Not provided'}</dd></div>
                    <div><dt>Date of birth</dt><dd>{formatDate(profile.date_of_birth)}</dd></div>
                    <div><dt>Nationality</dt><dd>{profile.nationality || 'Not provided'}</dd></div>
                    <div><dt>Country of residence</dt><dd>{profile.country_of_residence || 'Not provided'}</dd></div>
                    <div><dt>Address</dt><dd>{profile.address || 'Not provided'}</dd></div>
                    <div><dt>Town / county</dt><dd>{[profile.town, profile.county].filter(Boolean).join(', ') || 'Not provided'}</dd></div>
                  </dl>
                </section>

                <section className="student-record-card">
                  <div className="student-section-heading">
                    <div className="student-section-icon"><GraduationCap size={18} /></div>
                    <div>
                      <h2>Academic registration</h2>
                      <p>Term history and registered course units.</p>
                    </div>
                  </div>

                  <div className="student-enrollment-list">
                    {studentDetails.enrollments.length === 0 ? (
                      <div className="student-section-empty">No term enrollments recorded.</div>
                    ) : studentDetails.enrollments.map(enrollment => {
                      const expanded = expandedEnrollmentId === enrollment.id
                      const registrations = courseRegistrations[enrollment.id] || []
                      const registeredCodes = new Set(registrations.map(item => item.course_code))

                      return (
                        <article className="student-enrollment" key={enrollment.id}>
                          <button
                            type="button"
                            className="student-enrollment-toggle"
                            aria-expanded={expanded}
                            onClick={() => toggleCourseRegistrations(enrollment.id)}
                          >
                            <span className="student-enrollment-icon"><BookOpen size={17} /></span>
                            <span className="student-enrollment-copy">
                              <strong>{enrollment.term_name}</strong>
                              <span>{enrollment.year_name} · Year {enrollment.study_year} · Semester {enrollment.study_semester}</span>
                            </span>
                            <span className={`student-progression student-progression--${enrollment.progression_status || 'normal'}`}>
                              {enrollment.progression_status || 'normal'}
                            </span>
                            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>

                          {expanded && (
                            <div className="student-enrollment-content">
                              {regMsg.text && (
                                <div className={`students-feedback ${regMsg.error ? 'students-feedback--error' : 'students-feedback--success'}`} role={regMsg.error ? 'alert' : 'status'}>
                                  {regMsg.error ? <CircleAlert size={16} /> : <CheckCircle2 size={16} />}
                                  <span>{regMsg.text}</span>
                                </div>
                              )}
                              {registrationsLoading[enrollment.id] ? (
                                <div className="students-loading">Loading course registrations…</div>
                              ) : (
                                <>
                                  <div className="student-course-table-wrap">
                                    <table className="student-course-table">
                                      <thead>
                                        <tr><th>Course</th><th>Credits</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr>
                                      </thead>
                                      <tbody>
                                        {registrations.map(registration => (
                                          <tr key={registration.id}>
                                            <td>
                                              <strong>{registration.course_code}</strong>
                                              <span>{registration.course_name}</span>
                                            </td>
                                            <td>{registration.credits ?? '—'}</td>
                                            <td><span className="student-course-status">{registration.status}</span></td>
                                            <td>
                                              <button
                                                type="button"
                                                className="student-remove-course"
                                                onClick={() => { setCourseRemoval({ registrationId: registration.id, enrollmentId: enrollment.id, courseName: registration.course_name }); setRemovalError('') }}
                                              >
                                                <Trash2 size={14} /> Remove
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                        {registrations.length === 0 && (
                                          <tr><td className="student-course-empty" colSpan="4">No courses registered for this term.</td></tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="student-add-courses">
                                    <h3>Add course units</h3>
                                    {programmeCourses.length === 0 ? (
                                      <p className="student-section-empty">No course units are currently linked to this programme.</p>
                                    ) : (
                                      <div className="student-course-options">
                                        {programmeCourses.map(course => {
                                          const alreadyRegistered = registeredCodes.has(course.course_code)
                                          const selected = selectedCourses.includes(course.id)
                                          return (
                                            <label
                                              key={course.id}
                                              className={`student-course-option ${selected ? 'is-selected' : ''} ${alreadyRegistered ? 'is-registered' : ''}`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={selected}
                                                disabled={alreadyRegistered}
                                                onChange={() => toggleCourseSelection(course.id)}
                                              />
                                              <span><strong>{course.course_code}</strong>{course.name}</span>
                                              {alreadyRegistered && <span className="student-course-status">Registered</span>}
                                            </label>
                                          )
                                        })}
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      className="students-primary-button"
                                      disabled={!selectedCourses.length}
                                      onClick={() => handleRegisterCourses(enrollment.id)}
                                    >
                                      Register {selectedCourses.length ? `${selectedCourses.length} selected` : 'courses'}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </section>

                <section className="student-record-card">
                  <div className="student-section-heading">
                    <div className="student-section-icon student-section-icon--finance"><Receipt size={18} /></div>
                    <div>
                      <h2>Financial records</h2>
                      <p>Invoices and recorded payments on this student account.</p>
                    </div>
                  </div>
                  <h3 className="student-ledger-title">Invoices</h3>
                  <div className="student-course-table-wrap">
                    <table className="student-course-table student-ledger-table">
                      <thead>
                        <tr><th>Date issued</th><th>Term &amp; description</th><th>Amount</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {studentDetails.invoices.map(invoice => (
                          <tr key={invoice.id}>
                            <td>{formatDate(invoice.created_at)}</td>
                            <td>
                              <strong>{invoice.term_name || 'General term'}</strong>
                              <span>{invoice.description}{invoice.fee_type ? ` · ${invoice.fee_type}` : ''}</span>
                            </td>
                            <td>{formatMoney(invoice.currency, invoice.amount)}</td>
                            <td><span className={`student-course-status student-course-status--${invoice.status}`}>{invoice.status}</span></td>
                          </tr>
                        ))}
                        {studentDetails.invoices.length === 0 && (
                          <tr><td className="student-course-empty" colSpan="4">No invoices recorded.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <h3 className="student-ledger-title student-ledger-title--spaced">Payments</h3>
                  <div className="student-course-table-wrap">
                    <table className="student-course-table student-ledger-table">
                      <thead>
                        <tr><th>Payment date</th><th>Reference</th><th>Method</th><th>Amount</th></tr>
                      </thead>
                      <tbody>
                        {studentDetails.payments.map(payment => (
                          <tr key={payment.id}>
                            <td>{formatDate(payment.payment_date)}</td>
                            <td>{payment.reference_code || 'Not recorded'}</td>
                            <td>{payment.payment_method || 'Not recorded'}</td>
                            <td>{formatMoney(payment.currency, payment.amount)}</td>
                          </tr>
                        ))}
                        {studentDetails.payments.length === 0 && (
                          <tr><td className="student-course-empty" colSpan="4">No payments recorded.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="student-record-card student-enroll-card">
                  <div className="student-section-heading">
                    <div className="student-section-icon"><CalendarDays size={18} /></div>
                    <div>
                      <h2>Enroll in an academic term</h2>
                      <p>Register this student for an available term and study period.</p>
                    </div>
                  </div>
                  {enrollMsg.text && (
                    <div className={`students-feedback ${enrollMsg.error ? 'students-feedback--error' : 'students-feedback--success'}`} role={enrollMsg.error ? 'alert' : 'status'}>
                      {enrollMsg.error ? <CircleAlert size={16} /> : <CheckCircle2 size={16} />}
                      <span>{enrollMsg.text}</span>
                    </div>
                  )}
                  <form className="student-enroll-form" onSubmit={handleEnroll}>
                    <label>
                      <span>Academic term</span>
                      <select
                        value={enrollForm.academic_term_id}
                        onChange={event => setEnrollForm(previous => ({ ...previous, academic_term_id: event.target.value }))}
                        required
                      >
                        <option value="">Choose a term</option>
                        {terms.map(term => <option key={term.id} value={term.id}>{term.name}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Study year</span>
                      <select
                        value={enrollForm.study_year}
                        onChange={event => setEnrollForm(previous => ({ ...previous, study_year: Number(event.target.value) }))}
                      >
                        {[1, 2, 3, 4].map(year => <option key={year} value={year}>Year {year}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Semester</span>
                      <select
                        value={enrollForm.study_semester}
                        onChange={event => setEnrollForm(previous => ({ ...previous, study_semester: Number(event.target.value) }))}
                      >
                        <option value={1}>Semester 1</option>
                        <option value={2}>Semester 2</option>
                      </select>
                    </label>
                    <button type="submit" className="students-primary-button" disabled={enrolling || !terms.length}>
                      {enrolling ? 'Enrolling…' : 'Enroll student'}
                    </button>
                  </form>
                  {!terms.length && <p className="student-form-note">No academic terms are currently available.</p>}
                </section>
              </>
            )}
          </section>
        )}
      </main>

      {courseRemoval && (
        <div className="student-confirm-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !removingCourse) setCourseRemoval(null) }}>
          <section className="student-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="student-remove-title">
            <button
              type="button"
              className="student-confirm-close"
              aria-label="Close confirmation"
              disabled={removingCourse}
              onClick={() => setCourseRemoval(null)}
            >
              <X size={18} />
            </button>
            <span className="student-confirm-icon"><Trash2 size={20} /></span>
            <p className="students-eyebrow">Course registration</p>
            <h2 id="student-remove-title">Remove this course?</h2>
            <p>This will remove <strong>{courseRemoval.courseName}</strong> from this term’s registration. This action cannot be undone.</p>
            {removalError && <div className="students-feedback students-feedback--error" role="alert"><CircleAlert size={16} /><span>{removalError}</span></div>}
            <div className="student-confirm-actions">
              <button type="button" className="students-secondary-button" disabled={removingCourse} onClick={() => setCourseRemoval(null)}>Keep course</button>
              <button type="button" className="student-danger-button" disabled={removingCourse} onClick={handleRemoveCourseReg}>
                {removingCourse ? 'Removing…' : 'Remove registration'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
