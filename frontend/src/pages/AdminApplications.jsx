import { useState } from 'react'
import axios from 'axios'
import { FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'
import './AdminApplications.css'

export default function AdminApplications() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [selectedApp, setSelectedApp] = useState(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [admitting, setAdmitting] = useState(false)
  const [downloadingLetter, setDownloadingLetter] = useState(false)

  const token = localStorage.getItem('adminToken')
  const queryParams = {}
  if (statusFilter !== 'all') queryParams.status = statusFilter
  if (appliedSearch) queryParams.search = appliedSearch

  const { data: applicationsData, isLoading: loading, refetch: fetchApplications } = useApiQuery('/applications', 'adminApps', {
    axiosOptions: { 
      headers: { Authorization: `Bearer ${token}` },
      params: queryParams
    }
  })

  const applications = applicationsData?.data || []

  const handleSearchSubmit = (e) => {
    e.preventDefault()
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
      alert('Payment status updated')
    } catch (error) {
      console.error('Error updating payment status:', error)
      alert('Error updating payment status')
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
      alert('Payment reminder sent successfully')
    } catch (error) {
      alert(error.response?.data?.message || 'Error sending payment reminder')
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
      alert(`Choice ${newStatus === 'offered' ? 'offered' : 'rejected'} successfully`)
    } catch (error) {
      alert(error.response?.data?.message || 'Error evaluating choice')
    }
  }

  const handleAdmitStudent = async (appId) => {
    if (!confirm('Admit and enroll this student into the university ERP? This will generate their official student number, create their academic ledger, and initialize Year 1 Semester 1 enrollment.')) {
      return
    }
    const token = localStorage.getItem('adminToken')
    try {
      setAdmitting(true)
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/applications/${appId}/admit`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert(res.data.message || 'Student admitted successfully!')
      // Refresh application details
      const refreshed = await axios.get(
        `${import.meta.env.VITE_API_URL}/applications/${appId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSelectedApp(refreshed.data.data)
      fetchApplications()
    } catch (err) {
      alert(err.response?.data?.message || 'Error admitting student')
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
      alert(err.response?.data?.message || 'Error downloading admission letter')
    } finally {
      setDownloadingLetter(false)
    }
  }

  const handleDelete = async (appId) => {
    if (!confirm('Are you sure you want to delete this application? This cannot be undone.')) return

    const token = localStorage.getItem('adminToken')
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/applications/${appId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchApplications()
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp(null)
      }
    } catch (error) {
      console.error('Error deleting application:', error)
      alert('Error deleting application')
    }
  }

  const viewDetails = async (app) => {
    setSelectedApp(app)
    setAdminNotes(app.admin_notes || '')
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
    }
  }

  return (
    <div className="scope-adminapplications admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Applications Inbox</h1>
        </header>

        {!selectedApp ? (
          <div className="applications-container">
            <div className="inbox-controls">
              <div className="filter-buttons">
                {['all', 'pending', 'offered', 'admitted', 'rejected'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                  >
                    {status === 'all' ? 'All Applications' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              
              <form onSubmit={handleSearchSubmit} className="search-form">
                <input 
                  type="text" 
                  placeholder="Search by name, email, or ref number..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="button button-primary">Search</button>
              </form>
            </div>

            {loading ? (
              <div className="loading-state">Loading applications...</div>
            ) : applications.length > 0 ? (
              <div className="table-responsive">
                <table className="inbox-table">
                  <thead>
                    <tr>
                      <th>Reference No.</th>
                      <th>Applicant Name</th>
                      <th>Intake</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(app => (
                      <tr key={app.id}>
                        <td className="ref-cell">{app.reference_number}</td>
                        <td>
                          <strong>{app.first_name} {app.last_name}</strong>
                          <div className="text-muted">{app.email}</div>
                          {app.student_number && (
                            <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600, marginTop: '2px' }}>
                              No: {app.student_number}
                            </div>
                          )}
                        </td>
                        <td>{app.intake_name || '—'}</td>
                        <td>
                          <span className={`status-badge status-${app.payment_status || 'pending'}`}>
                            {(app.payment_status || 'pending').toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge status-${app.status}`}>
                            {app.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => viewDetails(app)} className="button button-outline button-sm">
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>No applications found matching the current filters.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="application-detail-view">
            <div className="detail-header">
              <button onClick={() => setSelectedApp(null)} className="button button-secondary">
                &larr; Back to Inbox
              </button>
              <div className="actions-right">
                <button onClick={() => handleDelete(selectedApp.id)} className="button button-danger-text">
                  Delete Application
                </button>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-main">
                <section className="detail-card">
                  <div className="card-header">
                    <h2>Applicant Profile</h2>
                    <span className={`status-badge status-${selectedApp.status}`}>
                      {selectedApp.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="profile-grid">
                    <div className="profile-photo">
                      {selectedApp.passport_photo_url ? (
                        <img 
                          src={`${import.meta.env.VITE_API_URL}/images/${selectedApp.passport_photo_url.split('/d/')[1]?.split('/')[0] || selectedApp.passport_photo_url.split('id=')[1]}`} 
                          alt="Applicant Passport" 
                        />
                      ) : (
                        <div className="photo-placeholder">No Photo</div>
                      )}
                    </div>
                    <div className="profile-info">
                      <h3>{selectedApp.first_name} {selectedApp.middle_name} {selectedApp.last_name}</h3>
                      <p><strong>Ref Number:</strong> {selectedApp.reference_number}</p>
                      {selectedApp.student_number && (
                        <p><strong>Student Number:</strong> <code style={{ background: '#e8f5e9', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{selectedApp.student_number}</code></p>
                      )}
                      <p><strong>Intake:</strong> {selectedApp.intake_name || '—'}</p>
                      <p><strong>Date of Birth:</strong> {new Date(selectedApp.date_of_birth).toLocaleDateString()}</p>
                      <p><strong>Gender:</strong> {selectedApp.gender}</p>
                      <p><strong>Nationality:</strong> {selectedApp.nationality}</p>
                      <p><strong>ID Number:</strong> {selectedApp.id_number || 'N/A'}</p>
                    </div>
                  </div>
                </section>

                <section className="detail-card">
                  <h2>Contact Information</h2>
                  <div className="info-grid">
                    <div>
                      <p className="label">Email</p>
                      <p>{selectedApp.email}</p>
                    </div>
                    <div>
                      <p className="label">Phone</p>
                      <p>{selectedApp.phone}</p>
                    </div>
                    <div>
                      <p className="label">Address</p>
                      <p>{selectedApp.address}</p>
                    </div>
                    <div>
                      <p className="label">Location</p>
                      <p>{selectedApp.town}, {selectedApp.county}</p>
                    </div>
                  </div>
                </section>

                <section className="detail-card">
                  <h2>Academic Background</h2>
                  {(() => {
                    const history = typeof selectedApp.academic_history === 'string' 
                      ? JSON.parse(selectedApp.academic_history) 
                      : selectedApp.academic_history
                    
                    if (!history || history.length === 0) return <p>No academic history provided.</p>

                    return (
                      <table className="academic-table">
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
                      </table>
                    )
                  })()}
                </section>

                <section className="detail-card">
                  <h2>Next of Kin / Emergency Contact</h2>
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
                  <h3>Document Vault</h3>
                  <p className="text-muted" style={{fontSize: '0.85rem', marginBottom: '1rem'}}>
                    These files are securely stored in Google Drive. Click to view.
                  </p>
                  
                  <div className="drive-link">
                    <a href={`https://drive.google.com/drive/folders/${selectedApp.drive_folder_id}`} target="_blank" rel="noreferrer" className="button button-outline" style={{width: '100%', marginBottom: '1.5rem'}}>
                      <i className="icon-folder"></i> Open Drive Folder
                    </a>
                  </div>

                  <h4>Uploaded Files</h4>
                  <ul className="doc-list">
                    {(() => {
                      const docs = typeof selectedApp.documents === 'string' 
                        ? JSON.parse(selectedApp.documents) 
                        : selectedApp.documents

                      if (!docs || docs.length === 0) return <li>No files uploaded</li>

                      return docs.map((doc, idx) => (
                        <li key={idx}>
                          <a href={doc.web_view_link || doc.url} target="_blank" rel="noreferrer">
                            <span className="doc-icon"><FileText size={16} /></span>
                            <span className="doc-name">{doc.name}</span>
                            <span className="doc-type">{doc.type}</span>
                          </a>
                        </li>
                      ))
                    })()}
                  </ul>
                </div>

                <div className="detail-card status-card">
                  <h3>Payment Status</h3>
                  <p>
                    Current:{' '}
                    <span className={`status-badge status-${selectedApp.payment_status || 'pending'}`}>
                      {(selectedApp.payment_status || 'pending').toUpperCase()}
                    </span>
                  </p>
                  {selectedApp.payment_status !== 'paid' ? (
                    <div className="decision-actions">
                      <button
                        onClick={() => sendPaymentReminder(selectedApp.id)}
                        className="button button-outline"
                        style={{width: '100%', marginBottom: '0.5rem'}}
                      >
                        Send Payment Reminder
                      </button>
                      <button
                        onClick={() => handlePaymentStatusUpdate(selectedApp.id, 'paid')}
                        className="button button-primary"
                        style={{width: '100%'}}
                      >
                        Mark as Paid
                      </button>
                    </div>
                  ) : (
                    <p style={{color: '#2e7d32', fontWeight: 600, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <CheckCircle size={15} /> Payment verified
                    </p>
                  )}
                </div>

                <div className="detail-card status-card">
                  <h3>Programme Choices</h3>

                  {/* If student is already admitted */}
                  {(selectedApp.status === 'admitted' || selectedApp.student_number) ? (
                    <div style={{
                      padding: '12px 14px',
                      background: '#e8f5e9',
                      border: '1px solid #81c784',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      color: '#1b5e20'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
                        <CheckCircle size={18} color="#2e7d32" /> Student Admitted &amp; Enrolled
                      </div>
                      <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                        <strong>Student Number:</strong>{' '}
                        <code style={{ background: '#fff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a5d6a7', fontWeight: 700, color: '#166534' }}>
                          {selectedApp.student_number}
                        </code>
                      </div>
                      <button
                        onClick={() => handleDownloadAdmissionLetter(selectedApp.id, selectedApp.reference_number)}
                        disabled={downloadingLetter}
                        className="button button-outline button-sm"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <FileText size={15} /> {downloadingLetter ? 'Downloading...' : 'Download Admission Letter'}
                      </button>
                    </div>
                  ) : (selectedApp.choices || []).some(c => c.status === 'offered') ? (
                    /* An offer has been made but not yet finalized as admitted */
                    <div style={{
                      padding: '12px 14px',
                      background: '#e3f2fd',
                      border: '1px solid #90caf9',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      color: '#0d47a1'
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
                        Offer Extended
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#1565c0', marginBottom: '8px' }}>
                        Applicant can accept from their student portal, or you can finalize enrollment directly:
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleAdmitStudent(selectedApp.id)}
                          disabled={admitting}
                          className="button button-primary button-sm"
                          style={{ flex: 1 }}
                        >
                          {admitting ? 'Admitting...' : 'Admit & Enroll'}
                        </button>
                        <button
                          onClick={() => handleDownloadAdmissionLetter(selectedApp.id, selectedApp.reference_number)}
                          disabled={downloadingLetter}
                          className="button button-outline button-sm"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          <FileText size={14} /> Letter PDF
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Fee notice if unpaid — DOES NOT HIDE CHOICES */}
                  {selectedApp.payment_status !== 'paid' && (
                    <div style={{
                      padding: '10px 12px',
                      background: '#fff3e0',
                      border: '1px solid #ffe0b2',
                      borderRadius: '6px',
                      color: '#e65100',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '1rem',
                      fontSize: '0.85rem'
                    }}>
                      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>Application Fee Unpaid:</strong> Choices are visible below for academic review. Mark the fee as paid before issuing an admission offer.
                      </div>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Reviewer Notes (Optional)</label>
                    <textarea
                      rows="3"
                      className="form-control"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Notes applied to evaluated choices..."
                    />
                  </div>

                  {(selectedApp.choices || []).map(choice => (
                    <div key={choice.id} style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '10px',
                      background: choice.status === 'offered' ? '#f0fdf4' : choice.status === 'enrolled' ? '#f0fdf4' : '#fafafa'
                    }}>
                      <p style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.95rem' }}>
                        Choice {choice.preference_order}: {choice.programme_name}
                        {choice.campus_name && (
                          <span style={{ fontWeight: 400, fontSize: '0.85rem', color: '#555', marginLeft: '8px' }}>
                            @ {choice.campus_name}
                          </span>
                        )}
                      </p>
                      <p style={{ marginBottom: '8px' }}>
                        <span className={`status-badge status-${choice.status}`}>
                          {choice.status.toUpperCase()}
                        </span>
                      </p>

                      {choice.reviewer_notes && (
                        <p style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic', marginBottom: '8px' }}>
                          Notes: {choice.reviewer_notes}
                        </p>
                      )}

                      {choice.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {selectedApp.payment_status === 'paid' ? (
                            <>
                              <button
                                onClick={() => handleChoiceEvaluation(choice.id, 'offered')}
                                className="button button-primary"
                                style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }}
                              >
                                Offer Admission
                              </button>
                              <button
                                onClick={() => handleChoiceEvaluation(choice.id, 'rejected')}
                                className="button"
                                style={{ flex: 1, fontSize: '0.8rem', padding: '6px', background: '#e74c3c', color: '#fff', border: 'none' }}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                disabled
                                className="button button-primary"
                                style={{ flex: 1, fontSize: '0.8rem', padding: '6px', opacity: 0.5, cursor: 'not-allowed' }}
                                title="Mark application fee as paid to offer admission"
                              >
                                Offer Admission
                              </button>
                              <button
                                disabled
                                className="button"
                                style={{ flex: 1, fontSize: '0.8rem', padding: '6px', background: '#e74c3c', color: '#fff', border: 'none', opacity: 0.5, cursor: 'not-allowed' }}
                                title="Mark application fee as paid to reject"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {choice.status === 'bypassed' && (
                        <p style={{ fontSize: '0.8rem', color: '#888', margin: 0 }}>
                          Bypassed — offer made on higher preference.
                        </p>
                      )}
                      {choice.status === 'offered' && (
                        <p style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600, margin: 0 }}>
                          ✓ Offer extended to applicant.
                        </p>
                      )}
                      {choice.status === 'enrolled' && (
                        <p style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600, margin: 0 }}>
                          ✓ Enrolled in this programme.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
