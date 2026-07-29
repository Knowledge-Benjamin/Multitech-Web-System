import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'
import './AdminSettings.css'

export default function AdminSettings() {
  const [admins, setAdmins] = useState([])
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState('users')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [driveStatus, setDriveStatus] = useState(false)
  const [emailDestination, setEmailDestination] = useState('')
  const [acknowledgementTemplate, setAcknowledgementTemplate] = useState('')
  const [emailLoading, setEmailLoading] = useState(true)
  const [emailSaving, setEmailSaving] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'admin'
  })

  const token = localStorage.getItem('adminToken')

  useEffect(() => {
    // Check for OAuth callback status in URL
    const params = new URLSearchParams(window.location.search)
    if (params.get('gdrive') === 'connected') {
      alert('Google Drive connected successfully!')
      window.history.replaceState({}, document.title, window.location.pathname)
      setActiveTab('integrations')
    } else if (params.get('gdrive') === 'error') {
      alert('Failed to connect Google Drive.')
      window.history.replaceState({}, document.title, window.location.pathname)
      setActiveTab('integrations')
    }

    if (activeTab === 'users') {
      fetchAdmins()
    } else if (activeTab === 'logs') {
      fetchLogs()
    } else if (activeTab === 'integrations') {
      fetchDriveStatus()
    } else if (activeTab === 'email') {
      fetchEmailSettings()
    }
  }, [activeTab])

  const fetchAdmins = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAdmins(response.data.admins || [])
    } catch (error) {
      console.error('Error fetching admins:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setLogs(response.data.logs || [])
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDriveStatus = async () => {
    setLoading(true)
    try {
      // Add cache-busting parameter to force fresh status check
      const response = await axios.get('/api/admin/gdrive/status', {
        params: { t: Date.now() },
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      setDriveStatus(response.data.connected)
    } catch (error) {
      console.error('Error fetching drive status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectDrive = async () => {
    try {
      // Add cache-busting parameter to force fresh request
      const timestamp = Date.now()
      console.log('Requesting auth URL from backend...')
      const response = await axios.get(`/api/admin/gdrive/auth-url?t=${timestamp}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      console.log('Auth URL response:', response)
      console.log('Response data:', response.data)
      console.log('Auth URL:', response.data.url)
      
      if (response.data && response.data.url) {
        console.log('Redirecting to:', response.data.url)
        window.location.href = response.data.url
      } else {
        console.error('No URL in response:', response.data)
        alert('Server did not return a valid authentication URL. Please try again.')
      }
    } catch (error) {
      console.error('Error getting auth URL:', error)
      console.error('Error response:', error.response)
      alert('Could not initiate Google Drive connection.')
    }
  }

  const handleDisconnectDrive = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? Image uploads will fail until reconnected.')) return
    try {
      await axios.delete('/api/admin/gdrive/disconnect', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDriveStatus(false)
      alert('Google Drive disconnected.')
      // Refresh status to confirm disconnection
      setTimeout(() => fetchDriveStatus(), 500)
    } catch (error) {
      console.error('Error disconnecting drive:', error)
      alert('Could not disconnect Google Drive.')
    }
  }

  const fetchEmailSettings = async () => {
    setEmailLoading(true)
    try {
      const response = await axios.get('/api/emails/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEmailDestination(response.data.data.contact_destination_email || '')
      setAcknowledgementTemplate(response.data.data.application_acknowledgement_template || '')
    } catch (error) {
      console.error('Error fetching email settings:', error)
    } finally {
      setEmailLoading(false)
    }
  }

  const handleSaveEmailSettings = async (e) => {
    e.preventDefault()
    setEmailSaving(true)
    try {
      await axios.put(
        '/api/emails/settings',
        {
          contact_destination_email: emailDestination,
          application_acknowledgement_template: acknowledgementTemplate
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert('Email settings saved successfully.')
    } catch (error) {
      console.error('Error saving email settings:', error)
      alert(error.response?.data?.message || 'Could not save email settings.')
    } finally {
      setEmailSaving(false)
    }
  }

  const renderTemplatePreview = (template) => {
    const sample = template || `Dear {{name}},\n\nThank you for submitting your application to Multitech Business School for the {{programmeName}} programme.\n\nYour application reference is {{applicationReference}}.\n\nApplication status: {{status}}\n\nYou can sign in to track your application with the details below:\nLogin email: {{loginEmail}}\nPassword: {{loginPassword}}\n\nIf you have questions, please reply to this email or contact our admissions team.\n\nBest regards,\nMultitech Business School Admissions Team`
    return sample
      .replace(/{{\s*name\s*}}/gi, 'Jane Doe')
      .replace(/{{\s*programmeName\s*}}/gi, 'Business Administration')
      .replace(/{{\s*applicationReference\s*}}/gi, 'MBS-20260628-001')
      .replace(/{{\s*status\s*}}/gi, 'pending')
      .replace(/{{\s*loginEmail\s*}}/gi, 'jane.doe@example.com')
      .replace(/{{\s*loginPassword\s*}}/gi, 'MBS-20260628-001')
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/admin/users', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setShowForm(false)
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'admin'
      })
      fetchAdmins()
      alert('Admin user created successfully!')
    } catch (error) {
      console.error('Error creating admin:', error)
      alert(error.response?.data?.message || 'Error creating admin')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this admin?')) return

    try {
      await axios.delete(`/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchAdmins()
      alert('Admin user deleted successfully!')
    } catch (error) {
      console.error('Error deleting admin:', error)
      alert(error.response?.data?.message || 'Error deleting admin')
    }
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Admin Settings</h1>
        </header>

        <div className="settings-tabs">
          <button
            onClick={() => setActiveTab('users')}
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          >
            Admin Users
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          >
            Activity Logs
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`tab-btn ${activeTab === 'integrations' ? 'active' : ''}`}
          >
            Integrations
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`tab-btn ${activeTab === 'email' ? 'active' : ''}`}
          >
            Email Settings
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="tab-content">
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + Add Admin User
            </button>

            {showForm && (
              <div className="form-container">
                <h2>Create New Admin User</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Username *</label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Password *</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Role</label>
                      <select name="role" value={formData.role} onChange={handleChange}>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      Create Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false)
                        setFormData({
                          username: '',
                          email: '',
                          password: '',
                          role: 'admin'
                        })
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="admins-table">
              {loading ? (
                <p>Loading...</p>
              ) : admins.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr key={admin.id}>
                        <td>{admin.username}</td>
                        <td>{admin.email}</td>
                        <td>
                          <span className={`role-badge ${admin.role}`}>
                            {admin.role}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${admin.status}`}>
                            {admin.status}
                          </span>
                        </td>
                        <td>{new Date(admin.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            onClick={() => handleDelete(admin.id)}
                            className="btn-delete"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-state">No admin users found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="tab-content">
            <div className="logs-container">
              {loading ? (
                <p>Loading...</p>
              ) : logs.length > 0 ? (
                <div className="logs-list">
                  {logs.map((log, idx) => (
                    <div key={idx} className="log-entry">
                      <div className="log-time">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                      <div className="log-details">
                        <strong>{log.username || 'Unknown'}</strong>
                        <span>{log.action}</span>
                        {log.entity_type && (
                          <span>{log.entity_type} {log.entity_id}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No activity logs found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="tab-content">
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Contact Form Destination</h2>
                <p>Incoming website contact messages will be delivered to this email address.</p>
              </div>
              {emailLoading ? (
                <p>Loading email settings...</p>
              ) : (
                <form onSubmit={handleSaveEmailSettings} className="email-settings-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Destination email address *</label>
                      <input
                        type="email"
                        value={emailDestination}
                        onChange={(e) => setEmailDestination(e.target.value)}
                        placeholder="admin@multitech.ac.ug"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Application acknowledgement template</label>
                    <textarea
                      value={acknowledgementTemplate}
                      onChange={(e) => setAcknowledgementTemplate(e.target.value)}
                      rows={10}
                      placeholder="Dear {{name}},\n\nThank you for applying..."
                      className="form-control"
                    />
                    <small>
                      Use placeholders: <code>{{name}}</code>, <code>{{programmeName}}</code>, <code>{{applicationReference}}</code>, <code>{{status}}</code>, <code>{{loginEmail}}</code>, <code>{{loginPassword}}</code>.
                    </small>
                  </div>

                  <div className="template-preview-card">
                    <div className="template-preview-header">
                      <h3>Preview</h3>
                    </div>
                    <pre className="template-preview-body">
{renderTemplatePreview(acknowledgementTemplate)}
                    </pre>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={emailSaving}>
                      {emailSaving ? 'Saving...' : 'Save Email'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="tab-content">
            <div className="integration-card">
              <div className="integration-header">
                <div className="integration-icon drive-icon">
                  <svg viewBox="0 0 87.3 80.6" width="40" height="40">
                    <path d="M58.1 4.5l-29 50.4H0L29.1 4.5h29z" fill="#FFC107"/>
                    <path d="M87.3 54.9L72.7 80.6H14.5L29 54.9h58.3z" fill="#4285F4"/>
                    <path d="M58.1 4.5L87.3 54.9 72.7 80.6 43.6 30 58.1 4.5z" fill="#0F9D58"/>
                  </svg>
                </div>
                <div className="integration-info">
                  <h2>Google Drive</h2>
                  <p>Store and serve article images securely in your Google Drive.</p>
                </div>
              </div>
              <div className="integration-status">
                Status: {loading ? (
                  <span className="status-badge pending">Checking...</span>
                ) : driveStatus ? (
                  <span className="status-badge active">Connected</span>
                ) : (
                  <span className="status-badge inactive">Not Connected</span>
                )}
              </div>
              <div className="integration-actions">
                {driveStatus ? (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handleDisconnectDrive} className="button button-danger">Disconnect</button>
                    <button onClick={handleConnectDrive} className="button button-secondary">Reconnect / Fix Permissions</button>
                  </div>
                ) : (
                  <button onClick={handleConnectDrive} className="button button-primary">Connect with Google</button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
