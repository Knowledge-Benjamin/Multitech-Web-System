import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'
import './AdminApplications.css'

export default function AdminApplications() {
  const [applications, setApplications] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState(null)
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    fetchApplications()
  }, [statusFilter])

  const fetchApplications = async () => {
    setLoading(true)
    const token = localStorage.getItem('adminToken')
    try {
      let url = `${import.meta.env.VITE_API_URL}/applications?`
      if (statusFilter !== 'all') url += `status=${statusFilter}&`
      if (searchQuery) url += `search=${searchQuery}&`
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setApplications(response.data.data || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchApplications()
  }

  const handleStatusUpdate = async (appId, newStatus) => {
    const token = localStorage.getItem('adminToken')
    
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/applications/${appId}/status`,
        { status: newStatus, admin_notes: adminNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchApplications()
      setSelectedApp(null)
      alert('Application status updated')
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status')
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
    // Optionally fetch full details if not returned in list, but our list query returns a.* so it's all there.
    setSelectedApp(app)
    setAdminNotes(app.admin_notes || '')
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Applications Inbox</h1>
        </header>

        {!selectedApp ? (
          <div className="applications-container">
            <div className="inbox-controls">
              <div className="filter-buttons">
                {['all', 'pending', 'reviewing', 'admitted', 'rejected'].map(status => (
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
                      <th>Programme</th>
                      <th>Date Applied</th>
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
                        </td>
                        <td>{app.programme_name}</td>
                        <td>{new Date(app.applied_at).toLocaleDateString()}</td>
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
                      <p><strong>Programme:</strong> {selectedApp.programme_name}</p>
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
                            <span className="doc-icon">📄</span>
                            <span className="doc-name">{doc.name}</span>
                            <span className="doc-type">{doc.type}</span>
                          </a>
                        </li>
                      ))
                    })()}
                  </ul>
                </div>

                <div className="detail-card status-card">
                  <h3>Admission Decision</h3>
                  <div className="form-group">
                    <label>Admin Notes (Internal)</label>
                    <textarea 
                      rows="4" 
                      className="form-control" 
                      value={adminNotes} 
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add private notes about this application..."
                    />
                  </div>
                  
                  <div className="decision-actions">
                    <button 
                      onClick={() => handleStatusUpdate(selectedApp.id, 'reviewing')} 
                      className={`button ${selectedApp.status === 'reviewing' ? 'button-primary' : 'button-outline'}`}
                      style={{width: '100%', marginBottom: '0.5rem'}}
                    >
                      Mark as Under Review
                    </button>
                    
                    <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
                      <button 
                        onClick={() => handleStatusUpdate(selectedApp.id, 'admitted')} 
                        className="button button-accent"
                        style={{flex: 1, backgroundColor: '#2ecc71', borderColor: '#2ecc71'}}
                      >
                        Admit Student
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(selectedApp.id, 'rejected')} 
                        className="button button-accent"
                        style={{flex: 1, backgroundColor: '#e74c3c', borderColor: '#e74c3c'}}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
