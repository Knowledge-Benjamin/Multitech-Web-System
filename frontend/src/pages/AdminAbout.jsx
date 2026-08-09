import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'
import './AdminArticles.css'

export default function AdminAbout() {
  const [about, setAbout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({ title: '', excerpt: '', content: '' })
  const [file, setFile] = useState(null)

  useEffect(() => {
    fetchAbout()
  }, [])

  const fetchAbout = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/about/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = (res.data.data && res.data.data[0]) || null
      setAbout(data)
      if (data) setFormData({ title: data.title || '', excerpt: data.excerpt || '', content: data.content || '' })
    } catch (err) {
      setError('Failed to load About content')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => setFile(e.target.files[0])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const token = localStorage.getItem('adminToken')
    const config = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
    const data = new FormData()
    data.append('title', formData.title)
    data.append('excerpt', formData.excerpt)
    data.append('content', formData.content)
    if (file) data.append('featured_image', file)

    try {
      // POST creates, PUT updates — backend handles either for single-record
      if (about) {
        await axios.put(`${import.meta.env.VITE_API_URL}/about`, data, config)
        setSuccess('About hero updated')
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/about`, data, config)
        setSuccess('About hero created')
      }
      setFile(null)
      fetchAbout()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save About')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete the About hero? This will remove the image and content.')) return
    try {
      const token = localStorage.getItem('adminToken')
      await axios.delete(`${import.meta.env.VITE_API_URL}/about`, { headers: { Authorization: `Bearer ${token}` } })
      setSuccess('About hero removed')
      setAbout(null)
      setFormData({ title: '', excerpt: '', content: '' })
    } catch (err) {
      setError('Failed to delete About hero')
    }
  }

  return (
    <div className="scope-adminabout admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Manage About Page Hero</h1>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="admin-form-section">
          <h2>{about ? 'Edit About Hero' : 'Create About Hero'}</h2>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label>Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleInputChange} required />
            </div>

            <div className="form-group">
              <label>Excerpt (short summary)</label>
              <textarea name="excerpt" value={formData.excerpt} onChange={handleInputChange} rows="2" maxLength={250} />
            </div>

            <div className="form-group">
              <label>Full Content</label>
              <textarea name="content" value={formData.content} onChange={handleInputChange} rows="6" />
            </div>

            <div className="form-group">
              <label>Featured Image</label>
              <input type="file" id="about-image-upload" accept="image/*" onChange={handleFileChange} />
              {about?.featured_image_url && !file && (
                <div className="current-image" style={{ marginTop: '0.5rem' }}>
                  <p style={{ margin: 0 }}>Current image: <a href={about.featured_image_url} target="_blank" rel="noreferrer">View</a></p>
                </div>
              )}
            </div>

            <div className="form-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="submit" className="button button-primary" disabled={loading}>{loading ? 'Saving...' : about ? 'Update' : 'Create'}</button>
              {about && (
                <button type="button" className="button button-danger" onClick={handleDelete} disabled={loading}>Delete</button>
              )}
            </div>
          </form>
        </div>

      </main>
    </div>
  )
}
