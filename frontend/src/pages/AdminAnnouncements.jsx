import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'
import './AdminAnnouncements.css'

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    campus: 'Kampala',
    published: false
  })

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get('/api/announcements')
      setAnnouncements(response.data.announcements || [])
    } catch (error) {
      console.error('Error fetching announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')

    try {
      if (editingId) {
        await axios.put(`/api/announcements/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post('/api/announcements', formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      
      setShowForm(false)
      setEditingId(null)
      setFormData({
        title: '',
        content: '',
        campus: 'Kampala',
        published: false
      })
      fetchAnnouncements()
    } catch (error) {
      console.error('Error saving announcement:', error)
      alert('Error saving announcement')
    }
  }

  const handleEdit = (announcement) => {
    setFormData(announcement)
    setEditingId(announcement.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return

    const token = localStorage.getItem('adminToken')
    try {
      await axios.delete(`/api/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchAnnouncements()
    } catch (error) {
      console.error('Error deleting announcement:', error)
      alert('Error deleting announcement')
    }
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Manage Announcements</h1>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + New Announcement
          </button>
        </header>

        {showForm && (
          <div className="form-container">
            <h2>{editingId ? 'Edit' : 'Create'} Announcement</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group full-width">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Announcement title"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Campus</label>
                  <select name="campus" value={formData.campus} onChange={handleChange}>
                    <option value="Kampala">Kampala</option>
                    <option value="Jinja">Jinja</option>
                    <option value="All">All Campuses</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="published"
                      checked={formData.published}
                      onChange={handleChange}
                    />
                    Published
                  </label>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Content *</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows="6"
                  placeholder="Announcement content"
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingId ? 'Update' : 'Create'} Announcement
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                    setFormData({
                      title: '',
                      content: '',
                      campus: 'Kampala',
                      published: false
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

        <div className="announcements-container">
          {loading ? (
            <p>Loading...</p>
          ) : announcements.length > 0 ? (
            <div className="announcements-grid">
              {announcements.map((ann) => (
                <div key={ann.id} className="announcement-card">
                  <div className="ann-header">
                    <h3>{ann.title}</h3>
                    <span className={`badge ${ann.published ? 'published' : 'draft'}`}>
                      {ann.published ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <div className="ann-meta">
                    <span>📍 {ann.campus || 'All'}</span>
                    <span>📅 {new Date(ann.created_at).toLocaleDateString()}</span>
                  </div>

                  <p className="ann-content">{ann.content.substring(0, 150)}...</p>

                  <div className="ann-actions">
                    <button onClick={() => handleEdit(ann)} className="btn-edit">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(ann.id)} className="btn-delete">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No announcements yet. Create one to get started!</p>
          )}
        </div>
      </main>
    </div>
  )
}
