import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'
import './AdminMessages.css'

export default function AdminMessages() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalMessages, setTotalMessages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [messageDetail, setMessageDetail] = useState(null)
  const [reply, setReply] = useState('')
  const [replySending, setReplySending] = useState(false)

  const token = localStorage.getItem('adminToken')

  useEffect(() => {
    fetchMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter])

  useEffect(() => {
    if (id) {
      fetchMessageDetail(id)
    } else {
      setMessageDetail(null)
      setReply('')
    }
  }, [id])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/emails/messages', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page,
          limit: pageSize,
          status: statusFilter || undefined,
          search: search || undefined
        }
      })
      setMessages(response.data.data.messages || [])
      setTotalMessages(response.data.data.total || 0)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessageDetail = async (messageId) => {
    setDetailLoading(true)
    try {
      const response = await axios.get(`/api/emails/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessageDetail(response.data.data)
      await axios.patch(`/api/emails/messages/${messageId}/read`, null, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchMessages()
    } catch (error) {
      console.error('Error fetching message detail:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleReplySubmit = async (e) => {
    e.preventDefault()
    if (!reply.trim()) return

    setReplySending(true)
    try {
      await axios.post(
        `/api/emails/messages/${id}/reply`,
        { reply },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setReply('')
      fetchMessageDetail(id)
      fetchMessages()
      alert('Reply sent successfully.')
    } catch (error) {
      console.error('Error sending reply:', error)
      alert(error.response?.data?.message || 'Could not send reply.')
    } finally {
      setReplySending(false)
    }
  }

  const filteredMessages = useMemo(() => messages, [messages])

  const totalPages = Math.ceil(totalMessages / pageSize)

  const handlePreviousPage = () => {
    setPage((prev) => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setPage((prev) => Math.min(prev + 1, totalPages || 1))
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content admin-messages-page">
        <header className="content-header">
          <h1>Contact Inbox</h1>
          <p>Review incoming contact form submissions, search messages, and reply from the admin portal.</p>
        </header>

        <div className="messages-grid">
          <section className="message-list-panel">
            <div className="message-list-header">
              <div>
                <h2>Messages</h2>
                <p>{filteredMessages.length} messages found</p>
              </div>
              <div className="message-list-filters">
                <input
                  type="search"
                  placeholder="Search sender, subject or message"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="message-list">
              {loading ? (
                <div className="message-loading">Loading messages...</div>
              ) : filteredMessages.length === 0 ? (
                <div className="empty-state">No messages match your search.</div>
              ) : (
                filteredMessages.map((message) => (
                  <Link
                    key={message.id}
                    to={`/admin/messages/${message.id}`}
                    className={`message-row ${message.is_read ? 'read' : 'unread'} ${id === String(message.id) ? 'active' : ''}`}
                  >
                    <div className="message-summary">
                      <div className="message-title">{message.subject}</div>
                      <div className="message-meta">
                        <span>{message.sender_name}</span>
                        <span>{message.sender_email}</span>
                        <span>{new Date(message.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="message-status">
                      <span className={`status-badge ${message.status}`}>{message.status}</span>
                      {message.delivery_error_message && (
                        <span className="message-error">Error</span>
                      )}
                      {message.is_read ? <span className="read-pill">Read</span> : <span className="unread-pill">New</span>}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="message-detail-panel">
            {id ? (
              detailLoading ? (
                <div className="message-loading">Loading message...</div>
              ) : messageDetail ? (
                <div className="message-detail-card">
                  <div className="detail-header">
                    <button className="button button-secondary" onClick={() => navigate('/admin/messages')}>
                      ← Back to inbox
                    </button>
                    <div>
                      <span className={`status-badge ${messageDetail.status}`}>{messageDetail.status}</span>
                      <span className={`reply-badge ${messageDetail.reply_status}`}>{messageDetail.reply_status}</span>
                    </div>
                  </div>

                  <div className="detail-info">
                    <div>
                      <h2>{messageDetail.subject}</h2>
                      <p className="detail-sender">From: {messageDetail.sender_name} <span>&lt;{messageDetail.sender_email}&gt;</span></p>
                    </div>
                    <div className="detail-meta">Received: {new Date(messageDetail.created_at).toLocaleString()}</div>
                  </div>

                  {messageDetail.delivery_error_message && (
                    <div className="error-summary">
                      <h4>Delivery error</h4>
                      <p>{messageDetail.delivery_error_message}</p>
                    </div>
                  )}

                  <div className="detail-body">
                    <p>{messageDetail.message}</p>
                    {messageDetail.page_url && (
                      <p className="detail-page">Page: <strong>{messageDetail.page_url}</strong></p>
                    )}
                  </div>

                  <div className="admin-reply-section">
                    <h3>Admin reply</h3>
                    <form onSubmit={handleReplySubmit} className="reply-form">
                      <textarea
                        rows="8"
                        placeholder="Write your reply here"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        required
                      />
                      <button type="submit" className="button button-primary" disabled={replySending}>
                        {replySending ? 'Sending reply...' : 'Send Reply'}
                      </button>
                    </form>
                    {messageDetail.admin_reply && (
                      <div className="reply-history">
                        <h4>Last reply</h4>
                        <p>{messageDetail.admin_reply}</p>
                        <p className="reply-meta">{messageDetail.reply_status} at {messageDetail.admin_replied_at ? new Date(messageDetail.admin_replied_at).toLocaleString() : 'N/A'}</p>
                      </div>
                    )}
                    {messageDetail.reply_error_message && (
                      <div className="error-summary reply-error">
                        <h4>Reply error</h4>
                        <p>{messageDetail.reply_error_message}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-state">Message not found.</div>
              )
            ) : (
              <div className="empty-state message-placeholder">
                <h2>Select a message to view details</h2>
                <p>Use the search bar and filters to narrow down messages.</p>
              </div>
            )}
          </section>
        </div>

        <div className="pagination-controls">
          <button className="button button-secondary" onClick={handlePreviousPage} disabled={page <= 1 || loading}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages || 1} ({totalMessages} messages)
          </span>
          <button className="button button-secondary" onClick={handleNextPage} disabled={page >= totalPages || loading}>
            Next
          </button>
        </div>
      </main>
    </div>
  )
}
