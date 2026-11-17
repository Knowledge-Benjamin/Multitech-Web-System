import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, CheckCircle2, CircleAlert,
  Clock3, FileText, GraduationCap, Layers3, Mail, Pencil, Plus, Search,
  ShieldCheck, Users, X
} from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'
import './AdminLecturers.css'

const API = import.meta.env.VITE_API_URL

const formatDate = (value) => {
  if (!value) return 'Date not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date not recorded'
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatCount = value => Number(value || 0).toLocaleString()

const getInitials = (firstName, lastName) => (
  `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'LE'
)

const getRequestError = (error, fallback) => (
  error.response?.data?.message || fallback
)

export default function AdminLecturers() {
  const [selectedLecturer, setSelectedLecturer] = useState(null)
  const [activeModal, setActiveModal] = useState('')
  const [statusTarget, setStatusTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [assignForm, setAssignForm] = useState({ course_id: '', academic_term_id: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const token = localStorage.getItem('adminToken')
  const headers = { Authorization: `Bearer ${token}` }
  const {
    data: lecturersData,
    isLoading: loadingLecturers,
    error: lecturersError,
    refetch: fetchLecturers
  } = useApiQuery('/admin/lecturers', 'adminLecturers', {
    axiosOptions: { headers }
  })
  const {
    data: termsData,
    isLoading: loadingTerms,
    error: termsError,
    refetch: refetchTerms
  } = useApiQuery(
    '/calendar/terms',
    'adminTerms',
    { axiosOptions: { headers } }
  )
  const {
    data: coursesData,
    isLoading: loadingCourses,
    error: coursesError,
    refetch: refetchCourses
  } = useApiQuery(
    '/course-units',
    'adminCourseUnits',
    { axiosOptions: { headers } }
  )
  const {
    data: assignmentsData,
    isLoading: loadingAssignments,
    error: assignmentsError,
    refetch: fetchAssignments
  } = useApiQuery(
    selectedLecturer ? `/admin/lecturers/${selectedLecturer.id}/assignments` : null,
    ['adminLecturerAssignments', selectedLecturer?.id],
    {
      axiosOptions: { headers },
      queryOptions: { enabled: !!selectedLecturer }
    }
  )

  const lecturers = lecturersData?.data || []
  const summary = lecturersData?.summary || {}
  const terms = termsData?.data || []
  const courses = coursesData?.data || []
  const assignments = assignmentsData?.data || []

  const filteredLecturers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return lecturers.filter(lecturer => {
      const name = `${lecturer.first_name || ''} ${lecturer.last_name || ''}`.toLowerCase()
      const matchesSearch = !query || name.includes(query) || lecturer.email?.toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' ? lecturer.is_active : !lecturer.is_active)
      return matchesSearch && matchesStatus
    })
  }, [lecturers, search, statusFilter])

  const availableCourses = courses.filter(course => !assignments.some(assignment => (
    String(assignment.course_id) === String(course.id)
    && String(assignment.academic_term_id) === String(assignForm.academic_term_id)
  )))

  useEffect(() => {
    if (!activeModal) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !saving) closeModal()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [activeModal, saving])

  const closeModal = () => {
    setActiveModal('')
    setStatusTarget(null)
    setError('')
  }

  const refreshLecturerRecord = async (lecturerId) => {
    const result = await fetchLecturers()
    const updatedLecturer = result.data?.data?.find(lecturer => lecturer.id === lecturerId)
    if (updatedLecturer) setSelectedLecturer(updatedLecturer)
  }

  const openCreateModal = () => {
    setForm({ first_name: '', last_name: '', email: '', password: '' })
    setError('')
    setSuccess('')
    setActiveModal('create')
  }

  const openEditModal = () => {
    if (!selectedLecturer) return
    setForm({
      first_name: selectedLecturer.first_name || '',
      last_name: selectedLecturer.last_name || '',
      email: selectedLecturer.email || '',
      password: ''
    })
    setError('')
    setSuccess('')
    setActiveModal('edit')
  }

  const openAssignModal = () => {
    setAssignForm({ course_id: '', academic_term_id: '' })
    setError('')
    setSuccess('')
    setActiveModal('assign')
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await axios.post(`${API}/admin/lecturers`, form, { headers })
      setSuccess(response.data.message || 'Lecturer account created.')
      closeModal()
      await fetchLecturers()
    } catch (requestError) {
      setError(getRequestError(requestError, 'Unable to create the lecturer account.'))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    if (!selectedLecturer) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await axios.put(
        `${API}/admin/lecturers/${selectedLecturer.id}`,
        {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          is_active: selectedLecturer.is_active
        },
        { headers }
      )
      setSelectedLecturer(previous => ({ ...previous, ...response.data.data }))
      setSuccess(response.data.message || 'Lecturer profile updated.')
      closeModal()
      await fetchLecturers()
    } catch (requestError) {
      setError(getRequestError(requestError, 'Unable to update the lecturer profile.'))
    } finally {
      setSaving(false)
    }
  }

  const handleAssign = async (event) => {
    event.preventDefault()
    if (!selectedLecturer) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await axios.post(
        `${API}/admin/lecturers/assignments`,
        {
          lecturer_id: selectedLecturer.id,
          course_id: assignForm.course_id,
          academic_term_id: assignForm.academic_term_id
        },
        { headers }
      )
      setSuccess(response.data.message || 'Course allocation added.')
      closeModal()
      await Promise.all([fetchAssignments(), refreshLecturerRecord(selectedLecturer.id)])
    } catch (requestError) {
      setError(getRequestError(requestError, 'Unable to add this course allocation.'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!statusTarget) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await axios.put(
        `${API}/admin/lecturers/${statusTarget.id}`,
        {
          first_name: statusTarget.first_name,
          last_name: statusTarget.last_name,
          email: statusTarget.email,
          is_active: !statusTarget.is_active
        },
        { headers }
      )
      if (selectedLecturer?.id === statusTarget.id) {
        setSelectedLecturer(previous => ({ ...previous, ...response.data.data }))
      }
      setSuccess(response.data.message || `Lecturer account ${statusTarget.is_active ? 'deactivated' : 'activated'}.`)
      closeModal()
      await fetchLecturers()
    } catch (requestError) {
      setError(getRequestError(requestError, 'Unable to update this lecturer account.'))
      setActiveModal('status')
    } finally {
      setSaving(false)
    }
  }

  const openLecturer = (lecturer) => {
    setSelectedLecturer(lecturer)
    setError('')
    setSuccess('')
  }

  const returnToDirectory = () => {
    setSelectedLecturer(null)
    setError('')
    setSuccess('')
  }

  const renderModal = () => {
    if (!activeModal) return null

    const isCreate = activeModal === 'create'
    const isEdit = activeModal === 'edit'
    const isAssign = activeModal === 'assign'
    const isStatus = activeModal === 'status'
    const title = isCreate
      ? 'Add lecturer'
      : isEdit
        ? 'Edit lecturer profile'
        : isAssign
          ? 'Allocate a course'
          : `${statusTarget?.is_active ? 'Deactivate' : 'Activate'} lecturer access`

    return (
      <div
        className="lecturers-modal-backdrop"
        onMouseDown={event => {
          if (event.target === event.currentTarget && !saving) closeModal()
        }}
      >
        <section className="lecturers-modal" role="dialog" aria-modal="true" aria-labelledby="lecturers-modal-title">
          <button type="button" className="lecturers-modal-close" onClick={closeModal} disabled={saving} aria-label="Close dialog">
            <X size={18} />
          </button>
          <p className="lecturers-eyebrow">Faculty management</p>
          <h2 id="lecturers-modal-title">{title}</h2>

          {(isCreate || isEdit) && (
            <form className="lecturers-form" onSubmit={isCreate ? handleCreate : handleUpdate}>
              <div className="lecturers-form-grid">
                <label>
                  <span>First name</span>
                  <input value={form.first_name} onChange={event => setForm(previous => ({ ...previous, first_name: event.target.value }))} autoComplete="given-name" required />
                </label>
                <label>
                  <span>Last name</span>
                  <input value={form.last_name} onChange={event => setForm(previous => ({ ...previous, last_name: event.target.value }))} autoComplete="family-name" required />
                </label>
              </div>
              <label>
                <span>Institutional email</span>
                <input type="email" value={form.email} onChange={event => setForm(previous => ({ ...previous, email: event.target.value }))} autoComplete="email" required />
              </label>
              {isCreate && (
                <label>
                  <span>Temporary password</span>
                  <input type="password" value={form.password} onChange={event => setForm(previous => ({ ...previous, password: event.target.value }))} autoComplete="new-password" required />
                  <small>Share this credential securely with the lecturer.</small>
                </label>
              )}
              {error && <div className="lecturers-feedback lecturers-feedback--error" role="alert"><CircleAlert size={16} /><span>{error}</span></div>}
              <div className="lecturers-modal-actions">
                <button type="button" className="lecturers-secondary-button" onClick={closeModal} disabled={saving}>Cancel</button>
                <button type="submit" className="lecturers-primary-button" disabled={saving}>
                  {saving ? 'Saving…' : isCreate ? 'Create account' : 'Save profile'}
                </button>
              </div>
            </form>
          )}

          {isAssign && (
            <form className="lecturers-form" onSubmit={handleAssign}>
              <p className="lecturers-modal-copy">
                Assign a course unit and term to {selectedLecturer?.first_name} {selectedLecturer?.last_name}. Existing allocations are retained.
              </p>
              {termsError || coursesError ? (
                <div className="lecturers-options-error">
                  <div className="lecturers-feedback lecturers-feedback--error" role="alert">
                    <CircleAlert size={16} />
                    <span>Course or term options could not be loaded. Try again before creating an allocation.</span>
                  </div>
                  <button
                    type="button"
                    className="lecturers-secondary-button"
                    onClick={() => Promise.all([refetchTerms(), refetchCourses()])}
                  >
                    Retry course and term options
                  </button>
                </div>
              ) : (
                <>
                  <label>
                    <span>Academic term</span>
                    <select
                      value={assignForm.academic_term_id}
                      onChange={event => setAssignForm({ course_id: '', academic_term_id: event.target.value })}
                      required
                      disabled={loadingTerms}
                    >
                      <option value="">{loadingTerms ? 'Loading academic terms…' : 'Choose an academic term'}</option>
                      {terms.map(term => (
                        <option key={term.id} value={term.id}>
                          {term.academic_year_name ? `${term.academic_year_name} · ` : ''}{term.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Course unit</span>
                    <select
                      value={assignForm.course_id}
                      onChange={event => setAssignForm(previous => ({ ...previous, course_id: event.target.value }))}
                      required
                      disabled={loadingCourses || !assignForm.academic_term_id || !availableCourses.length}
                    >
                      <option value="">
                        {!assignForm.academic_term_id
                          ? 'Choose a term first'
                          : loadingCourses
                            ? 'Loading course units…'
                            : availableCourses.length
                              ? 'Choose a course unit'
                              : 'All course units already allocated'}
                      </option>
                      {availableCourses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.course_code} · {course.name} · {course.programme_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {assignForm.academic_term_id && availableCourses.length === 0 && !loadingCourses && (
                    <p className="lecturers-form-note">No additional course units are available for this lecturer in the selected term.</p>
                  )}
                  {error && <div className="lecturers-feedback lecturers-feedback--error" role="alert"><CircleAlert size={16} /><span>{error}</span></div>}
                  <div className="lecturers-modal-actions">
                    <button type="button" className="lecturers-secondary-button" onClick={closeModal} disabled={saving}>Cancel</button>
                    <button type="submit" className="lecturers-primary-button" disabled={saving || loadingTerms || loadingCourses || !availableCourses.length}>
                      {saving ? 'Allocating…' : 'Add allocation'}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {isStatus && (
            <div className="lecturers-status-confirm">
              <p>
                {statusTarget?.is_active
                  ? `Deactivating ${statusTarget?.first_name} ${statusTarget?.last_name} prevents them from signing in. Their course allocations, materials, and grades will remain unchanged.`
                  : `Reactivating ${statusTarget?.first_name} ${statusTarget?.last_name} restores lecturer sign-in without changing their records.`}
              </p>
              {error && <div className="lecturers-feedback lecturers-feedback--error" role="alert"><CircleAlert size={16} /><span>{error}</span></div>}
              <div className="lecturers-modal-actions">
                <button type="button" className="lecturers-secondary-button" onClick={closeModal} disabled={saving}>Cancel</button>
                <button
                  type="button"
                  className={statusTarget?.is_active ? 'lecturers-warning-button' : 'lecturers-primary-button'}
                  onClick={handleToggleActive}
                  disabled={saving}
                >
                  {saving ? 'Updating…' : statusTarget?.is_active ? 'Deactivate access' : 'Activate access'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="scope-adminlecturers admin-layout">
      <AdminSidebar />
      <main className="admin-content admin-lecturers-content">
        {!selectedLecturer ? (
          <>
            <header className="lecturers-page-header">
              <div>
                <p className="lecturers-eyebrow">Academic operations</p>
                <h1>Lecturers</h1>
                <p className="lecturers-page-intro">
                  Review teaching allocations and related academic activity, then manage lecturer accounts from one place.
                </p>
              </div>
              <button type="button" className="lecturers-primary-button" onClick={openCreateModal}>
                <Plus size={17} /> Add lecturer
              </button>
            </header>

            {success && <div className="lecturers-feedback lecturers-feedback--success" role="status"><CheckCircle2 size={17} /><span>{success}</span></div>}
            {lecturersData && !lecturersData.examIntegrationAvailable && (
            <div className="lecturers-info-banner" role="status">
              Online exam totals are unavailable because the exam portal integration is not configured in this database.
            </div>
            )}

            <section className="lecturers-stat-grid" aria-label="Lecturer overview">
              <article className="lecturers-stat-card">
                <span className="lecturers-stat-icon"><Users size={18} /></span>
                <span className="lecturers-stat-label">Lecturers</span>
                <strong>{formatCount(summary.totalLecturers ?? lecturers.length)}</strong>
                <span className="lecturers-stat-note">Accounts on file</span>
              </article>
              <article className="lecturers-stat-card">
                <span className="lecturers-stat-icon lecturers-stat-icon--active"><ShieldCheck size={18} /></span>
                <span className="lecturers-stat-label">Active access</span>
                <strong>{formatCount(summary.activeLecturers ?? lecturers.filter(lecturer => lecturer.is_active).length)}</strong>
                <span className="lecturers-stat-note">Eligible to sign in</span>
              </article>
              <article className="lecturers-stat-card">
                <span className="lecturers-stat-icon lecturers-stat-icon--courses"><BookOpen size={18} /></span>
                <span className="lecturers-stat-label">Course allocations</span>
                <strong>{formatCount(summary.totalAssignments ?? lecturers.reduce((total, lecturer) => total + Number(lecturer.total_assignments || 0), 0))}</strong>
                <span className="lecturers-stat-note">Across academic terms</span>
              </article>
              <article className="lecturers-stat-card">
                <span className="lecturers-stat-icon lecturers-stat-icon--materials"><FileText size={18} /></span>
                <span className="lecturers-stat-label">Course materials</span>
                <strong>{formatCount(summary.totalMaterials ?? lecturers.reduce((total, lecturer) => total + Number(lecturer.total_materials || 0), 0))}</strong>
                <span className="lecturers-stat-note">Uploaded by lecturers</span>
              </article>
            </section>

            <section className="lecturers-directory-card">
              <div className="lecturers-directory-header">
                <div>
                  <h2>Teaching staff directory</h2>
                  <p>Search by name or institutional email. Open a record to review allocations and teaching activity.</p>
                </div>
                <div className="lecturers-directory-total">{formatCount(filteredLecturers.length)} shown</div>
              </div>

              <div className="lecturers-filters">
                <label className="lecturers-search">
                  <Search size={17} aria-hidden="true" />
                  <span className="lecturers-visually-hidden">Search lecturers</span>
                  <input type="search" placeholder="Search name or email" value={search} onChange={event => setSearch(event.target.value)} />
                </label>
                <label className="lecturers-status-filter">
                  <span className="lecturers-visually-hidden">Filter by account status</span>
                  <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                    <option value="all">All account statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              {lecturersError ? (
                <div className="lecturers-feedback lecturers-feedback--error" role="alert">
                  <CircleAlert size={17} />
                  <span>Lecturer records could not be loaded. Check your connection and try again.</span>
                  <button type="button" onClick={() => fetchLecturers()}>Retry</button>
                </div>
              ) : loadingLecturers ? (
                <div className="lecturers-loading" role="status">Loading lecturer records…</div>
              ) : filteredLecturers.length === 0 ? (
                <div className="lecturers-empty">
                  <span className="lecturers-empty-icon"><Users size={22} /></span>
                  <h3>{lecturers.length ? 'No matching lecturers' : 'No lecturer accounts yet'}</h3>
                  <p>{lecturers.length ? 'Adjust the search or status filter.' : 'Add a lecturer account to begin allocating teaching responsibilities.'}</p>
                  {lecturers.length === 0 && <button type="button" className="lecturers-secondary-button" onClick={openCreateModal}><Plus size={16} /> Add lecturer</button>}
                </div>
              ) : (
                <div className="lecturers-table-wrap">
                  <table className="lecturers-table">
                    <thead>
                      <tr>
                        <th scope="col">Lecturer</th>
                        <th scope="col">Teaching activity</th>
                        <th scope="col">Course materials</th>
                        <th scope="col">Account</th>
                        <th scope="col"><span className="lecturers-visually-hidden">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLecturers.map(lecturer => (
                        <tr key={lecturer.id}>
                          <td>
                            <div className="lecturers-identity">
                              <span className="lecturers-avatar">{getInitials(lecturer.first_name, lecturer.last_name)}</span>
                              <span className="lecturers-identity-copy">
                                <strong>{lecturer.first_name} {lecturer.last_name}</strong>
                                <span><Mail size={13} />{lecturer.email}</span>
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="lecturers-activity-primary">
                              {formatCount(lecturer.total_assignments)} allocation{Number(lecturer.total_assignments) === 1 ? '' : 's'}
                            </span>
                            <span className="lecturers-table-subtext">
                              {formatCount(lecturer.total_students)} unique students · {lecturer.total_exams == null ? 'Exam data unavailable' : `${formatCount(lecturer.total_exams)} online exams`}
                            </span>
                          </td>
                          <td>
                            <span className="lecturers-activity-primary">{formatCount(lecturer.total_materials)} uploaded</span>
                            <span className="lecturers-table-subtext">
                              {formatCount(lecturer.total_grade_records)} grade records · {formatCount(lecturer.total_scheduled_classes)} scheduled classes
                            </span>
                          </td>
                          <td>
                            <span className={`lecturers-status-pill ${lecturer.is_active ? 'is-active' : 'is-inactive'}`}>
                              {lecturer.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="lecturers-table-subtext">
                              {formatCount(lecturer.current_assignments)} current-term allocations
                            </span>
                          </td>
                          <td className="lecturers-table-actions">
                            <button type="button" className="lecturers-view-button" onClick={() => openLecturer(lecturer)}>
                              View record <ArrowRight size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="lecturer-record-view">
            <button type="button" className="lecturers-back-button" onClick={returnToDirectory}>
              <ArrowLeft size={16} /> Back to lecturers
            </button>

            {success && <div className="lecturers-feedback lecturers-feedback--success" role="status"><CheckCircle2 size={17} /><span>{success}</span></div>}

            <header className="lecturer-profile-hero">
              <div className="lecturer-profile-main">
                <span className="lecturer-profile-avatar">{getInitials(selectedLecturer.first_name, selectedLecturer.last_name)}</span>
                <div>
                  <p className="lecturers-eyebrow">Lecturer record</p>
                  <h1>{selectedLecturer.first_name} {selectedLecturer.last_name}</h1>
                  <a className="lecturer-profile-email" href={`mailto:${selectedLecturer.email}`}><Mail size={15} />{selectedLecturer.email}</a>
                </div>
              </div>
              <div className="lecturer-profile-actions">
                <span className={`lecturers-status-pill ${selectedLecturer.is_active ? 'is-active' : 'is-inactive'}`}>
                  {selectedLecturer.is_active ? 'Active account' : 'Inactive account'}
                </span>
                <button type="button" className="lecturers-secondary-button" onClick={openEditModal}><Pencil size={15} /> Edit profile</button>
                <button
                  type="button"
                  className={selectedLecturer.is_active ? 'lecturers-danger-outline-button' : 'lecturers-secondary-button'}
                  onClick={() => {
                    setStatusTarget(selectedLecturer)
                    setError('')
                    setActiveModal('status')
                  }}
                >
                  {selectedLecturer.is_active ? 'Deactivate access' : 'Activate access'}
                </button>
              </div>
              <div className="lecturer-profile-created">
                <span>Account created</span><strong>{formatDate(selectedLecturer.created_at)}</strong>
              </div>
            </header>

            {error && !activeModal && <div className="lecturers-feedback lecturers-feedback--error" role="alert"><CircleAlert size={17} /><span>{error}</span></div>}

            <section className="lecturer-metrics-grid" aria-label="Lecturer teaching summary">
              <article className="lecturer-metric-card">
                <span className="lecturer-metric-icon"><BookOpen size={18} /></span>
                <span>All-term allocations</span><strong>{formatCount(selectedLecturer.total_assignments)}</strong>
              </article>
              <article className="lecturer-metric-card">
                <span className="lecturer-metric-icon"><CalendarDays size={18} /></span>
                <span>Current-term allocations</span><strong>{formatCount(selectedLecturer.current_assignments)}</strong>
              </article>
              <article className="lecturer-metric-card">
                <span className="lecturer-metric-icon"><Users size={18} /></span>
                <span>Unique students</span><strong>{formatCount(selectedLecturer.total_students)}</strong>
              </article>
              <article className="lecturer-metric-card">
                <span className="lecturer-metric-icon lecturer-metric-icon--green"><FileText size={18} /></span>
                <span>Course materials</span><strong>{formatCount(selectedLecturer.total_materials)}</strong>
              </article>
              <article className="lecturer-metric-card">
                <span className="lecturer-metric-icon lecturer-metric-icon--purple"><GraduationCap size={18} /></span>
                <span>Graded course records</span><strong>{formatCount(selectedLecturer.total_grade_records)}</strong>
              </article>
              <article className="lecturer-metric-card">
                <span className="lecturer-metric-icon lecturer-metric-icon--amber"><Layers3 size={18} /></span>
                <span>Online exams</span><strong>{selectedLecturer.total_exams == null ? 'Unavailable' : formatCount(selectedLecturer.total_exams)}</strong>
              </article>
              <article className="lecturer-metric-card">
                <span className="lecturer-metric-icon"><Clock3 size={18} /></span>
                <span>Class schedules</span><strong>{formatCount(selectedLecturer.total_scheduled_classes)}</strong>
              </article>
              <article className="lecturer-metric-card">
                <span className="lecturer-metric-icon lecturer-metric-icon--purple"><GraduationCap size={18} /></span>
                <span>Programmes taught</span><strong>{formatCount(selectedLecturer.total_programmes)}</strong>
              </article>
            </section>

            <section className="lecturers-assignments-card">
              <div className="lecturers-assignments-header">
                <div>
                  <p className="lecturers-eyebrow">Teaching load</p>
                  <h2>Course allocations</h2>
                  <p>Course, programme, term, and supported learning activity from the academic records.</p>
                </div>
                <button
                  type="button"
                  className="lecturers-primary-button"
                  onClick={openAssignModal}
                  disabled={loadingAssignments || Boolean(assignmentsError)}
                >
                  <Plus size={16} /> Allocate course
                </button>
              </div>

              {assignmentsError ? (
                <div className="lecturers-feedback lecturers-feedback--error" role="alert">
                  <CircleAlert size={17} />
                  <span>Course allocations could not be loaded.</span>
                  <button type="button" onClick={() => fetchAssignments()}>Retry</button>
                </div>
              ) : loadingAssignments ? (
                <div className="lecturers-loading" role="status">Loading course allocations…</div>
              ) : assignments.length === 0 ? (
                <div className="lecturers-empty lecturers-empty--compact">
                  <span className="lecturers-empty-icon"><BookOpen size={21} /></span>
                  <h3>No course allocations</h3>
                  <p>Allocate an existing course unit to this lecturer for an academic term.</p>
                </div>
              ) : (
                <div className="lecturers-allocation-list">
                  {assignments.map(assignment => (
                    <article className="lecturer-allocation-card" key={assignment.id}>
                      <div className="lecturer-allocation-main">
                        <span className="lecturer-course-code">{assignment.course_code}</span>
                        <div>
                          <h3>{assignment.course_name}</h3>
                          <p>{assignment.programme_name} · Year {assignment.target_year} · Semester {assignment.target_semester}</p>
                          {Array.isArray(assignment.modules) && assignment.modules.length > 0 && (
                            <p className="lecturer-allocation-modules">
                              Curriculum: {assignment.modules.join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="lecturer-allocation-term">
                        <CalendarDays size={15} />
                        <span>
                          <strong>{assignment.year_name}</strong>
                          <small>{assignment.term_name}</small>
                          {assignment.term_start_date && assignment.term_end_date && (
                            <small>{formatDate(assignment.term_start_date)} – {formatDate(assignment.term_end_date)}</small>
                          )}
                        </span>
                      </div>
                      <div className="lecturer-allocation-stats">
                        <span><Users size={14} /><strong>{formatCount(assignment.enrolled_students)}</strong><small>students</small></span>
                        <span><FileText size={14} /><strong>{formatCount(assignment.materials_count)}</strong><small>materials</small></span>
                        <span><GraduationCap size={14} /><strong>{formatCount(assignment.grade_records)}</strong><small>grade records</small></span>
                        <span><Layers3 size={14} /><strong>{assignment.exams_count == null ? '—' : formatCount(assignment.exams_count)}</strong><small>online exams</small></span>
                        <span><Clock3 size={14} /><strong>{formatCount(assignment.scheduled_classes)}</strong><small>class schedules</small></span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}
      </main>
      {renderModal()}
    </div>
  )
}
