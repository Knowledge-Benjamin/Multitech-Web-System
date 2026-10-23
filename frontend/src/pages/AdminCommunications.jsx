import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'
import { Mail, Users, Download, Send, Search, Trash2, CheckCircle2, UserCheck, RefreshCw } from 'lucide-react'
import './AdminCommunications.css'

export default function AdminCommunications() {
  const token = localStorage.getItem('adminToken')
  const authHeaders = { Authorization: `Bearer ${token}` }

  // Tabs: 'compose' | 'subscribers'
  const [activeTab, setActiveTab] = useState('compose')

  // --- Compose State ---
  const [recipients, setRecipients] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [attachments, setAttachments] = useState([])
  const [sending, setSending] = useState(false)
  const [defaults, setDefaults] = useState({})

  // --- Mailing List State ---
  const [subscribers, setSubscribers] = useState([])
  const [subscribersCount, setSubscribersCount] = useState({ total: 0, active: 0 })
  const [loadingSubscribers, setLoadingSubscribers] = useState(false)
  const [subscriberSearch, setSubscriberSearch] = useState('')
  const [subscriberStatusFilter, setSubscriberStatusFilter] = useState('all')

  useEffect(() => {
    fetchDefaults()
    fetchSubscribers()
  }, [])

  const fetchDefaults = async () => {
    try {
      const response = await axios.get('/api/emails/communications/defaults', {
        headers: authHeaders
      })
      setDefaults(response.data.data)
      setReplyTo(response.data.data.contactEmail || response.data.data.emailFrom)
    } catch (error) {
      console.error('Error fetching defaults:', error)
    }
  }

  const fetchSubscribers = async () => {
    setLoadingSubscribers(true)
    try {
      const res = await axios.get('/api/emails/mailing-list/subscribers', {
        headers: authHeaders,
        params: {
          search: subscriberSearch,
          status: subscriberStatusFilter,
          listName: 'Multitech Insider'
        }
      })
      if (res.data.success) {
        setSubscribers(res.data.data.subscribers || [])
        setSubscribersCount({
          total: res.data.data.totalCount || 0,
          active: res.data.data.activeCount || 0
        })
      }
    } catch (err) {
      console.error('Error fetching subscribers:', err)
    } finally {
      setLoadingSubscribers(false)
    }
  }

  const handleDeleteSubscriber = async (id, email) => {
    if (!window.confirm(`Remove ${email} from Multitech Insider mailing list?`)) return
    try {
      await axios.delete(`/api/emails/mailing-list/subscribers/${id}`, {
        headers: authHeaders
      })
      fetchSubscribers()
    } catch (err) {
      alert('Failed to delete subscriber.')
    }
  }

  const handleBroadcastToSubscribers = () => {
    const activeEmails = subscribers
      .filter(s => s.status === 'subscribed')
      .map(s => s.email)

    if (activeEmails.length === 0) {
      alert('No active subscribers to broadcast to.')
      return
    }

    setRecipients(defaults.contactEmail || defaults.emailFrom || 'inquiries@multitech.ac.ug')
    setBcc(activeEmails.join(', '))
    setSubject('[Multitech Insider] ')
    setActiveTab('compose')
  }

  const handleExportCsv = () => {
    if (subscribers.length === 0) {
      alert('No subscribers to export.')
      return
    }
    const headers = ['Email', 'Name', 'List', 'Source', 'Status', 'Date Subscribed']
    const rows = subscribers.map(s => [
      `"${s.email}"`,
      `"${s.name || ''}"`,
      `"${s.list_name}"`,
      `"${s.source}"`,
      `"${s.status}"`,
      `"${new Date(s.created_at).toISOString()}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `multitech_insider_subscribers_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileChange = (event) => {
    setAttachments(Array.from(event.target.files))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!recipients || !subject || !message) {
      alert('Recipients, subject and message are required.')
      return
    }

    const formData = new FormData()
    formData.append('recipients', recipients)
    formData.append('subject', subject)
    formData.append('text', message)
    formData.append('replyTo', replyTo)
    if (cc) formData.append('cc', cc)
    if (bcc) formData.append('bcc', bcc)
    attachments.forEach((file) => formData.append('attachments', file))

    setSending(true)
    try {
      await axios.post('/api/emails/communications/send', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      alert('Email sent successfully.')
      setRecipients('')
      setCc('')
      setBcc('')
      setSubject('')
      setMessage('')
      setAttachments([])
    } catch (error) {
      console.error('Error sending email:', error)
      alert(error.response?.data?.message || 'Could not send email.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="scope-admincommunications admin-layout">
      <AdminSidebar />
      <main className="admin-content admin-communications-page" style={{ padding: '2rem' }}>
        <header className="content-header" style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
                Communications &amp; Audience
              </h1>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                Manage custom email broadcasts and audience subscriptions for <strong>Multitech Insider</strong>
              </p>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeTab === 'compose' ? 'white' : 'transparent',
                  color: activeTab === 'compose' ? '#1e293b' : '#64748b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Mail size={15} /> Compose Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('subscribers')
                  fetchSubscribers()
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeTab === 'subscribers' ? 'white' : 'transparent',
                  color: activeTab === 'subscribers' ? '#1e293b' : '#64748b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Users size={15} /> Multitech Insider ({subscribersCount.active})
              </button>
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: COMPOSE EMAIL
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'compose' && (
          <div className="communications-card" style={{ background: 'white', borderRadius: '14px', padding: '2rem', border: '1px solid rgba(0,0,0,0.06)' }}>
            <form onSubmit={handleSubmit} className="communications-form">
              <div className="form-group">
                <label>Recipients</label>
                <textarea
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="Enter one or more recipient emails, separated by commas, semicolons, or new lines"
                  rows={2}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>CC</label>
                  <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Optional CC recipients" />
                </div>
                <div className="form-group">
                  <label>BCC (Blind Carbon Copy &mdash; Recommended for Mailing Lists)</label>
                  <input 
                    type="text" 
                    value={bcc} 
                    onChange={(e) => setBcc(e.target.value)} 
                    placeholder="Subscribers or hidden recipients" 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reply-To</label>
                <input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder={defaults.contactEmail || defaults.emailFrom || 'inquiries@multitech.ac.ug'} />
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Message Content</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={9}
                  required
                />
              </div>

              <div className="form-group">
                <label>Attachments</label>
                <input type="file" multiple onChange={handleFileChange} />
                {attachments.length > 0 && (
                  <ul className="attachment-list">
                    {attachments.map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="button button-primary" disabled={sending} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={15} /> {sending ? 'Sending…' : 'Send Broadcast'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: MULTITECH INSIDER MAILING LIST
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'subscribers' && (
          <div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Subscribers
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-secondary)', marginTop: '4px' }}>
                  {subscribersCount.total}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                  Multitech Insider list members
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ color: '#059669', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Active Subscribers
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                  {subscribersCount.active}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                  Subscribed &amp; eligible for email updates
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              border: '1px solid rgba(0,0,0,0.06)',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              {/* Search & Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', gap: '6px' }}>
                  <Search size={14} style={{ color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Search subscriber name or email..."
                    value={subscriberSearch}
                    onChange={(e) => setSubscriberSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchSubscribers()}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem', width: '220px' }}
                  />
                </div>

                <select
                  value={subscriberStatusFilter}
                  onChange={(e) => {
                    setSubscriberStatusFilter(e.target.value)
                  }}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="subscribed">Subscribed Only</option>
                  <option value="unsubscribed">Unsubscribed Only</option>
                </select>

                <button
                  type="button"
                  onClick={fetchSubscribers}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Search & Refresh"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    color: '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>

                <button
                  type="button"
                  onClick={handleBroadcastToSubscribers}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Send size={14} /> Broadcast to Multitech Insider
                </button>
              </div>
            </div>

            {/* Subscribers Table */}
            <div className="table-container" style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
              {loadingSubscribers ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading Multitech Insider subscribers...
                </div>
              ) : subscribers.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <Users size={36} style={{ color: '#94a3b8', marginBottom: '0.75rem' }} />
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-secondary)' }}>No Subscribers Found</h3>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>
                    Users who check "Subscribe to Multitech Insider" on the public website or join via the footer will appear here.
                  </p>
                </div>
              ) : (
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Subscriber Email</th>
                      <th>Name</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Date Subscribed</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.email}</strong>
                        </td>
                        <td>{s.name || <span style={{ color: '#94a3b8' }}>&mdash;</span>}</td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'capitalize' }}>
                            {String(s.source || 'website').replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${s.status === 'subscribed' ? 'status-admitted' : 'status-rejected'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                          {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubscriber(s.id, s.email)}
                            style={{
                              background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c',
                              padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer'
                            }}
                            title="Remove subscriber"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
