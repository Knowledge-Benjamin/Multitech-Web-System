import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'
import './AdminCommunications.css'

export default function AdminCommunications() {
  const [recipients, setRecipients] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [attachments, setAttachments] = useState([])
  const [sending, setSending] = useState(false)
  const [defaults, setDefaults] = useState({})
  const token = localStorage.getItem('adminToken')

  useEffect(() => {
    fetchDefaults()
  }, [])

  const fetchDefaults = async () => {
    try {
      const response = await axios.get('/api/emails/communications/defaults', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDefaults(response.data.data)
      setReplyTo(response.data.data.contactEmail || response.data.data.emailFrom)
    } catch (error) {
      console.error('Error fetching defaults:', error)
    }
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
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content admin-communications-page">
        <header className="content-header">
          <h1>Communications</h1>
          <p>Compose custom emails, attach documents, and send one-off or broadcast messages.</p>
        </header>

        <div className="communications-card">
          <form onSubmit={handleSubmit} className="communications-form">
            <div className="form-group">
              <label>Recipients</label>
              <textarea
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="Enter one or more recipient emails, separated by commas, semicolons, or new lines"
                rows={3}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>CC</label>
                <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Optional CC recipients" />
              </div>
              <div className="form-group">
                <label>BCC</label>
                <input type="text" value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="Optional BCC recipients" />
              </div>
            </div>

            <div className="form-group">
              <label>Reply-To</label>
              <input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder={defaults.contactEmail || defaults.emailFrom || 'reply@example.com'} />
            </div>

            <div className="form-group">
              <label>Subject</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={10}
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

            <div className="form-actions">
              <button type="submit" className="button button-primary" disabled={sending}>
                {sending ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
