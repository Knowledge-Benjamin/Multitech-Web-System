import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  Search,
  Trash2,
  UserRound,
  X
} from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'
import './AdminApplications.css'

const formatSubmissionDate = (value, options = { dateStyle: 'medium', timeStyle: 'short' }) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-UG', options).format(date)
}

export default function AdminApplications() {
  const [statusFilter, setStatusFilter] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedApp, setSelectedApp] = useState(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [admitting, setAdmitting] = useState(false)
  const [downloadingLetter, setDownloadingLetter] = useState(false)
  const [refreshingDetails, setRefreshingDetails] = useState(false)
  const [pageError, setPageError] = useState('')
  const [pageNotice, setPageNotice] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [confirmingAction, setConfirmingAction] = useState(false)

  const token = localStorage.getItem('adminToken')
  const queryParams = {}
  if (statusFilter !== 'all') queryParams.status = statusFilter
  if (appliedSearch) queryParams.search = appliedSearch
  queryParams.page = currentPage
  queryParams.limit = pageSize

  const {
    data: applicationsData,
    isLoading: loading,
    isError: applicationsLoadFailed,
    error: applicationsLoadError,
    refetch: fetchApplications
  } = useApiQuery('/applications', 'adminApps', {
    axiosOptions: { 
      headers: { Authorization: `Bearer ${token}` },
      params: queryParams
    }
  })

  const applications = applicationsData?.data || []
  const pagination = applicationsData?.pagination
  const totalPages = Math.max(pagination?.totalPages || 1, 1)

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    setAppliedSearch(searchQuery)
  }

  const handlePaymentStatusUpdate = async (appId, newStatus) => {
    const token = localStorage.getItem('adminToken')
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/applications/${appId}/payment`,
        { payment_status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSelectedApp(prev => ({ ...prev, payment_status: newStatus }))
      fetchApplications()
      setPageNotice('Payment status updated.')
      setPageError('')
    } catch (error) {
      console.error('Error updating payment status:', error)
      setPageError(error.response?.data?.message || 'Payment status could not be updated.')
    }
  }

  const sendPaymentReminder = async (appId) => {
    const token = localStorage.getItem('adminToken')
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/applications/${appId}/remind-payment`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPageNotice('Payment reminder sent successfully.')
      setPageError('')
    } catch (error) {
      setPageError(error.response?.data?.message || 'The payment reminder could not be sent.')
    }
  }

  const handleChoiceEvaluation = async (choiceId, newStatus) => {
    const token = localStorage.getItem('adminToken')
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/applications/${selectedApp.id}/choices/${choiceId}`,
        { status: newStatus, reviewer_notes: adminNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      // Re-fetch the individual application to get updated choices
      const refreshed = await axios.get(
        `${import.meta.env.VITE_API_URL}/applications/${selectedApp.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSelectedApp(refreshed.data.data)
      fetchApplications()
      setPageNotice(`Choice ${newStatus === 'offered' ? 'offered' : 'rejected'} successfully.`)
      setPageError('')
    } catch (error) {
      setPageError(error.response?.data?.message || 'The programme choice could not be updated.')
    }
  }

  const handleAdmitStudent = async (appId) => {
    setConfirmation({ type: 'admit', appId })
  }

  const admitStudent = async (appId) => {
    const token = localStorage.getItem('adminToken')
    try {
      setAdmitting(true)
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/applications/${appId}/admit`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPageNotice(res.data.message || 'Student admitted successfully.')
      setPageError('')
      // Refresh application details
      const refreshed = await axios.get(
        `${import.meta.env.VITE_API_URL}/applications/${appId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSelectedApp(refreshed.data.data)
      fetchApplications()
    } catch (err) {
      setPageError(err.response?.data?.message || 'The student could not be admitted.')
    } finally {
      setAdmitting(false)
    }
  }

  const handleDownloadAdmissionLetter = async (appId, refNum) => {
    const token = localStorage.getItem('adminToken')
    try {
      setDownloadingLetter(true)
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/applications/${appId}/admission-letter`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      )
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Admission-Letter-${refNum || appId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setPageError(err.response?.data?.message || 'The admission letter could not be downloaded.')
    } finally {
      setDownloadingLetter(false)
    }
  }

  const handleDelete = async (appId) => {
    setConfirmation({ type: 'delete', appId })
  }

  const deleteApplication = async (appId) => {
    const token = localStorage.getItem('adminToken')
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/applications/${appId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchApplications()
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp(null)
      }
      setPageNotice('Application deleted.')
      setPageError('')
    } catch (error) {
      console.error('Error deleting application:', error)
      setPageError(error.response?.data?.message || 'The application could not be deleted.')
    }
  }

  const confirmPendingAction = async () => {
    if (!confirmation) return
    setConfirmingAction(true)
    if (confirmation.type === 'admit') {
      await admitStudent(confirmation.appId)
    } else {
      await deleteApplication(confirmation.appId)
    }
    setConfirmation(null)
    setConfirmingAction(false)
  }

  const viewDetails = async (app) => {
    setSelectedApp(app)
    setAdminNotes(app.admin_notes || '')
    setPageError('')
    setPageNotice('')
    setRefreshingDetails(true)
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/applications/${app.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data?.success && res.data.data) {
        setSelectedApp(res.data.data)
      }
    } catch (err) {
      console.error('Error refreshing application details:', err)
      setPageError(err.response?.data?.message || 'The latest application details could not be loaded.')
    } finally {
      setRefreshingDetails(false)
    }
  }

  useEffect(() => {
    if (!confirmation) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !confirmingAction) setConfirmation(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [confirmation, confirmingAction])

  return (
    <div className="scope-adminapplications admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="applications-header">
          <div>
            <p className="applications-eyebrow">Admissions</p>
            <h1>{selectedApp ? 'Application review' : <>Applications <em>inbox</em></>}</h1>
            <p className="applications-subtitle">
              {selectedApp
                ? `Review applicant details and programme choices for ${selectedApp.reference_number}.`
                : 'Review applications, verify payment, and move each applicant through admissions.'}
            </p>
          </div>
          {selectedApp && (
            <button type="button" onClick={() => setSelectedApp(null)} className="applications-back-button">
              <ArrowLeft size={16} /> Back to inbox
            </button>
          )}
        </header>

        {pageError && (
          <div className="applications-feedback applications-feedback--error" role="alert">
            <AlertCircle size={17} />
            <span>{pageError}</span>
            <button type="button" onClick={() => setPageError('')} aria-label="Dismiss error"><X size={16} /></button>
          </div>
        )}
        {pageNotice && (
          <div className="applications-feedback applications-feedback--success" role="status">
            <CheckCircle size={17} />
            <span>{pageNotice}</span>
            <button type="button" onClick={() => setPageNotice('')} aria-label="Dismiss notification"><X size={16} /></button>
          </div>
        )}

        {!selectedApp ? (
          <div className="applications-container">
            <div className="inbox-controls">
              <div className="filter-buttons" role="group" aria-label="Filter applications by status">
                {['pending', 'offered', 'admitted', 'rejected', 'all'].map(status => (
                  <button
                    type="button"
                    key={status}
                    onClick={() => {
                      setStatusFilter(status)
                      setCurrentPage(1)
                    }}
                    className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                    aria-pressed={statusFilter === status}
                  >
                    {status === 'all' ? 'All applications' : status.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              
              <form onSubmit={handleSearchSubmit} className="search-form">
                <label className="applications-search">
                  <Search size={17} aria-hidden="true" />
                  <span className="applications-sr-only">Search applications</span>
                <input 
                  type="search"
                  placeholder="Name, email, or reference number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button type="button" onClick={() => { setSearchQuery(''); setAppliedSearch(''); setCurrentPage(1) }} aria-label="Clear search">
                    <X size={15} />
                  </button>
                )}
                </label>
                <button type="submit" className="applications-primary-button">Search</button>
              </form>
            </div>

            {loading ? (
              <div className="applications-state" role="status"><span className="applications-spinner" /> Loading applications…</div>
            ) : applicationsLoadFailed ? (
              <div className="applications-state applications-state--error" role="alert">
                <AlertCircle size={24} />
                <p>{applicationsLoadError?.response?.data?.message || 'Applications could not be loaded.'}</p>
                <button type="button" className="applications-secondary-button" onClick={() => fetchApplications()}>Try again</button>
              </div>
            ) : applications.length > 0 ? (
              <>
              <div className="table-responsive">
                <table className="inbox-table">
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Applicant</th>
                      <th scope="col">Submitted</th>
                      <th scope="col">Intake</th>
                      <th scope="col">Payment</th>
                      <th scope="col">Application status</th>
                      <th scope="col"><span className="applications-sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(app => (
                      <tr key={app.id}>
                        <td><span className="ref-cell">{app.reference_number}</span></td>
                        <td>
                          <div className="applicant-cell">
                            <span className="applicant-avatar" aria-hidden="true">
                              {(app.first_name?.[0] || '')}{(app.last_name?.[0] || '')}
                            </span>
                            <span>
                              <strong>{app.first_name} {app.last_name}</strong>
                              <span className="text-muted">{app.email}</span>
                            </span>
                          </div>
                          {app.student_number && (
                            <span className="student-number">Student no. {app.student_number}</span>
                          )}
                        </td>
                        <td>
                          <time className="application-submitted-date" dateTime={app.applied_at || undefined}>
                            {formatSubmissionDate(app.applied_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </time>
                          {app.applied_at && (
                            <span className="application-submitted-time">
                              {formatSubmissionDate(app.applied_at, { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          )}
                        </td>
                        <td>{app.intake_name || '—'}</td>
                        <td>
                          <span className={`applications-status applications-status--${app.payment_status || 'pending'}`}>
                            {app.payment_status || 'pending'}
                          </span>
                        </td>
                        <td>
                          <span className={`applications-status applications-status--${app.status || 'pending'}`}>
                            {(app.status || 'pending').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          <button type="button" onClick={() => viewDetails(app)} className="applications-review-button">
                            Review <ChevronRight size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav className="applications-pagination" aria-label="Application inbox pages">
                <p>
                  Showing <strong>{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, pagination?.total || applications.length)}</strong>
                  {' '}of <strong>{pagination?.total ?? applications.length}</strong> applications
                </p>
                <div className="applications-pagination-controls">
                  <label>
                    <span>Rows</span>
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value))
                        setCurrentPage(1)
                      }}
                      aria-label="Applications per page"
                    >
                      {[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </label>
                  <span className="applications-page-count">Page {currentPage} of {totalPages}</span>
                  <button
                    type="button"
                    className="applications-page-button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage <= 1 || loading}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={17} /> Previous
                  </button>
                  <button
                    type="button"
                    className="applications-page-button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage >= totalPages || loading}
                    aria-label="Next page"
                  >
                    Next <ChevronRight size={17} />
                  </button>
                </div>
              </nav>
              </>
            ) : (
              <div className="applications-state applications-empty-state">
                <span className="applications-empty-icon"><FileText size={23} /></span>
                <h2>{appliedSearch || statusFilter !== 'pending' ? 'No matching applications' : 'No pending applications'}</h2>
                <p>{appliedSearch || statusFilter !== 'pending'
                  ? 'Try another search or status filter.'
                  : 'There are no applications waiting for review right now.'}</p>
                {(appliedSearch || statusFilter !== 'pending') && (
                  <button
                    type="button"
                    className="applications-secondary-button"
                    onClick={() => { setStatusFilter('pending'); setSearchQuery(''); setAppliedSearch(''); setCurrentPage(1) }}
                  >
                    Reset to pending inbox
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="application-detail-view">
            <div className="detail-summary">
              <div>
                <span className="detail-reference">{selectedApp.reference_number}</span>
                <span className={`applications-status applications-status--${selectedApp.status || 'pending'}`}>
                  {(selectedApp.status || 'pending').replace(/_/g, ' ')}
                </span>
                <span className="detail-submitted-date">
                  <CalendarDays size={15} />
                  Submitted {formatSubmissionDate(selectedApp.applied_at)}
                </span>
                {refreshingDetails && <span className="detail-refreshing">Updating details…</span>}
              </div>
              <button type="button" onClick={() => handleDelete(selectedApp.id)} className="applications-danger-button">
                <Trash2 size={15} /> Delete application
              </button>
            </div>

            <div className="detail-grid">
              <div className="detail-main">
                <section className="detail-card">
                  <div className="card-header">
                    <div>
                      <p className="applications-eyebrow">Applicant</p>
                      <h2>Personal profile</h2>
                    </div>
                  </div>
                  
                  <div className="profile-grid">
                    <div className="profile-photo">
                      {selectedApp.passport_photo_url ? (
                        <img 
                          src={`${import.meta.env.VITE_API_URL}/images/${selectedApp.passport_photo_url.split('/d/')[1]?.split('/')[0] || selectedApp.passport_photo_url.split('id=')[1]}`} 
                          alt={`${selectedApp.first_name} ${selectedApp.last_name} passport photo`}
                        />
                      ) : (
                        <div className="photo-placeholder"><UserRound size={28} /><span>No photo</span></div>
                      )}
                    </div>
                    <div className="profile-info">
                      <h3>{selectedApp.first_name} {selectedApp.middle_name} {selectedApp.last_name}</h3>
                      {selectedApp.student_number && <span className="student-number">Student no. {selectedApp.student_number}</span>}
                      <dl className="profile-facts">
                        <div><dt>Intake</dt><dd>{selectedApp.intake_name || '—'}</dd></div>
                        <div><dt>Date of birth</dt><dd>{selectedApp.date_of_birth ? new Date(selectedApp.date_of_birth).toLocaleDateString() : '—'}</dd></div>
                        <div><dt>Gender</dt><dd>{selectedApp.gender || '—'}</dd></div>
                        <div><dt>Nationality</dt><dd>{selectedApp.nationality || '—'}</dd></div>
                        <div><dt>ID number</dt><dd>{selectedApp.id_number || '—'}</dd></div>
                      </dl>
                    </div>
                  </div>
                </section>

                <section className="detail-card">
                  <h2>Contact information</h2>
                  <div className="info-grid">
                    <div>
                      <p className="label">Email</p>
                      <p>{selectedApp.email || '—'}</p>
                    </div>
                    <div>
                      <p className="label">Phone</p>
                      <p>{selectedApp.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="label">Address</p>
                      <p>{selectedApp.address || '—'}</p>
                    </div>
                    <div>
                      <p className="label">Location</p>
                      <p>{[selectedApp.town, selectedApp.county].filter(Boolean).join(', ') || '—'}</p>
                    </div>
                  </div>
                </section>

                <section className="detail-card">
                  <h2>Academic background</h2>
                  {(() => {
                    const history = typeof selectedApp.academic_history === 'string' 
                      ? JSON.parse(selectedApp.academic_history) 
                      : selectedApp.academic_history
                    
                    if (!history || history.length === 0) return <p className="detail-empty">No academic history provided.</p>

                    return (
                      <div className="academic-table-wrap"><table className="academic-table">
                        <thead>
                          <tr>
                            <th>Institution</th>
                            <th>Qualification</th>
                            <th>Year</th>
                            <th>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((edu, idx) => (
                            <tr key={idx}>
                              <td>{edu.institution}</td>
                              <td>{edu.qualification}</td>
                              <td>{edu.year_completed}</td>
                              <td>{edu.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table></div>
                    )
                  })()}
                </section>

                <section className="detail-card">
                  <h2>Next of kin / emergency contact</h2>
                  <div className="info-grid">
                    <div>
                      <p className="label">Name</p>
                      <p>{selectedApp.kin_name}</p>
                    </div>
                    <div>
                      <p className="label">Relationship</p>
                      <p>{selectedApp.kin_relationship}</p>
                    </div>
                    <div>
                      <p className="label">Phone</p>
                      <p>{selectedApp.kin_phone}</p>
                    </div>
                    <div>
                      <p className="label">Email</p>
                      <p>{selectedApp.kin_email || 'N/A'}</p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="detail-sidebar">
                <div className="detail-card docs-card">
                  <p className="applications-eyebrow">Application files</p>
                  <h3>Document vault</h3>
                  <p className="text-muted">
                    These files are securely stored in Google Drive. Click to view.
                  </p>
                  
                  {selectedApp.drive_folder_id && (
                    <a href={`https://drive.google.com/drive/folders/${selectedApp.drive_folder_id}`} target="_blank" rel="noreferrer" className="applications-secondary-button drive-link">
                      <FolderOpen size={16} /> Open Drive folder
                    </a>
                  )}

                  <h4>Uploaded files</h4>
                  <ul className="doc-list">
                    {(() => {
                      const docs = typeof selectedApp.documents === 'string' 
                        ? JSON.parse(selectedApp.documents) 
                        : selectedApp.documents

                      if (!docs || docs.length === 0) return <li className="doc-empty">No files uploaded</li>

                      return docs.map((doc, idx) => (
                        <li key={idx}>
                          <a href={doc.web_view_link || doc.url} target="_blank" rel="noreferrer">
                            <span className="doc-icon"><FileText size={16} /></span>
                            <span className="doc-name">{doc.name}</span>
                            <span className="doc-type">{doc.type || 'Document'}</span>
                          </a>
                        </li>
                      ))
                    })()}
                  </ul>
                </div>

                <div className="detail-card status-card">
                  <p className="applications-eyebrow">Application fee</p>
                  <h3>Payment status</h3>
                  <p className="status-current">
                    Current status
                    <span className={`applications-status applications-status--${selectedApp.payment_status || 'pending'}`}>
                      {(selectedApp.payment_status || 'pending').replace(/_/g, ' ')}
                    </span>
                  </p>
                  {selectedApp.payment_status !== 'paid' ? (
                    <div className="decision-actions">
                      <button
                        type="button"
                        onClick={() => sendPaymentReminder(selectedApp.id)}
                        className="applications-secondary-button"
                      >
                        Send payment reminder
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePaymentStatusUpdate(selectedApp.id, 'paid')}
                        className="applications-primary-button"
                      >
                        Mark as paid
                      </button>
                    </div>
                  ) : (
                    <p className="payment-verified">
                      <CheckCircle size={15} /> Payment verified
                    </p>
                  )}
                </div>

                <div className="detail-card status-card">
                  <p className="applications-eyebrow">Academic review</p>
                  <h3>Programme choices</h3>

                  {/* If student is already admitted */}
                  {(selectedApp.status === 'admitted' || selectedApp.student_number) ? (
                    <div className="admission-callout admission-callout--success">
                      <div className="admission-callout-title">
                        <CheckCircle size={18} /> Student admitted and enrolled
                      </div>
                      <div className="admission-callout-number">
                        <strong>Student Number:</strong>{' '}
                        <code>{selectedApp.student_number}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadAdmissionLetter(selectedApp.id, selectedApp.reference_number)}
                        disabled={downloadingLetter}
                        className="applications-secondary-button"
                      >
                        <FileText size={15} /> {downloadingLetter ? 'Downloading…' : 'Download admission letter'}
                      </button>
                    </div>
                  ) : (selectedApp.choices || []).some(c => c.status === 'offered') ? (
                    /* An offer has been made but not yet finalized as admitted */
                    <div className="admission-callout admission-callout--offer">
                      <div className="admission-callout-title">
                        Offer extended
                      </div>
                      <div className="admission-callout-copy">
                        Applicant can accept from their student portal, or you can finalize enrollment directly:
                      </div>
                      <div className="admission-callout-actions">
                        <button
                          type="button"
                          onClick={() => handleAdmitStudent(selectedApp.id)}
                          disabled={admitting}
                          className="applications-primary-button"
                        >
                          {admitting ? 'Preparing…' : 'Admit & enroll'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadAdmissionLetter(selectedApp.id, selectedApp.reference_number)}
                          disabled={downloadingLetter}
                          className="applications-secondary-button"
                        >
                          <FileText size={14} /> {downloadingLetter ? 'Downloading…' : 'Letter PDF'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Fee notice if unpaid — DOES NOT HIDE CHOICES */}
                  {selectedApp.payment_status !== 'paid' && (
                    <div className="fee-warning">
                      <AlertCircle size={16} />
                      <div>
                        <strong>Application fee unpaid.</strong> Choices remain available for academic review, but payment must be verified before an offer can be issued.
                      </div>
                    </div>
                  )}

                  <div className="reviewer-notes">
                    <label htmlFor="application-reviewer-notes">Reviewer notes <span>(optional)</span></label>
                    <textarea
                      id="application-reviewer-notes"
                      rows="3"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Notes applied to evaluated choices..."
                    />
                  </div>

                  {(selectedApp.choices || []).map(choice => (
                    <article key={choice.id} className={`programme-choice programme-choice--${choice.status}`}>
                      <div className="programme-choice-heading">
                        <div>
                          <span className="choice-preference">Choice {choice.preference_order}</span>
                          <h4>{choice.programme_name}</h4>
                          {choice.campus_name && <p>{choice.campus_name}</p>}
                        </div>
                        <span className={`applications-status applications-status--${choice.status}`}>
                          {choice.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {choice.reviewer_notes && <p className="choice-reviewer-notes">Reviewer note: {choice.reviewer_notes}</p>}

                      {choice.status === 'pending' && (
                        <div className="choice-actions">
                          {selectedApp.payment_status === 'paid' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleChoiceEvaluation(choice.id, 'offered')}
                                className="applications-primary-button"
                              >
                                Offer admission
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChoiceEvaluation(choice.id, 'rejected')}
                                className="applications-danger-button"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled
                                className="applications-primary-button"
                                title="Mark application fee as paid to offer admission"
                              >
                                Offer admission
                              </button>
                              <button
                                type="button"
                                disabled
                                className="applications-danger-button"
                                title="Mark application fee as paid to reject"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {choice.status === 'bypassed' && (
                        <p className="choice-status-note">
                          Bypassed — offer made on higher preference.
                        </p>
                      )}
                      {choice.status === 'offered' && (
                        <p className="choice-status-note">
                          Offer extended to applicant.
                        </p>
                      )}
                      {choice.status === 'enrolled' && (
                        <p className="choice-status-note">
                          Enrolled in this programme.
                        </p>
                      )}
                    </article>
                  ))}
                  {(!selectedApp.choices || selectedApp.choices.length === 0) && (
                    <p className="detail-empty">No programme choices were included with this application.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {confirmation && (
          <div className="applications-modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget && !confirmingAction) setConfirmation(null)
          }}>
            <section
              className="applications-confirmation-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="application-confirmation-title"
              aria-describedby="application-confirmation-copy"
            >
              <button
                type="button"
                className="applications-modal-close"
                onClick={() => setConfirmation(null)}
                disabled={confirmingAction}
                aria-label="Close confirmation"
              >
                <X size={18} />
              </button>
              <span className={`applications-modal-icon ${confirmation.type === 'delete' ? 'is-danger' : 'is-admit'}`}>
                {confirmation.type === 'delete' ? <Trash2 size={21} /> : <CheckCircle size={21} />}
              </span>
              <p className="applications-eyebrow">Please confirm</p>
              <h2 id="application-confirmation-title">
                {confirmation.type === 'delete' ? 'Delete this application?' : 'Admit and enroll this student?'}
              </h2>
              <p id="application-confirmation-copy">
                {confirmation.type === 'delete'
                  ? 'This permanently removes the application and cannot be undone.'
                  : 'This creates the student record, generates an official student number, and initializes their first-semester enrollment.'}
              </p>
              <div className="applications-modal-actions">
                <button
                  type="button"
                  className="applications-secondary-button"
                  onClick={() => setConfirmation(null)}
                  disabled={confirmingAction}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={confirmation.type === 'delete' ? 'applications-danger-button' : 'applications-primary-button'}
                  onClick={confirmPendingAction}
                  disabled={confirmingAction}
                >
                  {confirmingAction
                    ? 'Please wait…'
                    : confirmation.type === 'delete' ? 'Delete application' : 'Confirm admission'}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
