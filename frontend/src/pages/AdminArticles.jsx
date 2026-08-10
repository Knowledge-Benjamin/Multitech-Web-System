import { useState, useEffect } from 'react'
import axios from 'axios'
import './AdminArticles.css'
import AdminSidebar from '../components/AdminSidebar'

export default function AdminArticles() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [currentArticle, setCurrentArticle] = useState(null)
  
  const initialFormData = {
    title: '',
    excerpt: '',
    content: '',
    is_pinned: false,
    status: 'draft'
  }

  const [formData, setFormData] = useState(initialFormData)
  const [file, setFile] = useState(null)
  const [submitAction, setSubmitAction] = useState('')

  useEffect(() => {
    fetchArticles()
    
    // Load draft from auto-save if not editing an existing article
    const savedDraft = localStorage.getItem('article_draft_autosave')
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        setFormData(parsed)
      } catch (e) {
        console.error('Failed to parse autosave data')
      }
    }
  }, [])

  // Auto-save logic
  useEffect(() => {
    if (!isEditing && formData.title || formData.content || formData.excerpt) {
      localStorage.setItem('article_draft_autosave', JSON.stringify(formData))
    }
  }, [formData, isEditing])

  const fetchArticles = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/articles/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setArticles(response.data.data)
    } catch (err) {
      setError('Failed to fetch articles')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const token = localStorage.getItem('adminToken')
    const config = {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    }

    // Determine final status based on the button clicked
    let finalStatus = formData.status
    if (submitAction === 'publish') finalStatus = 'published'
    if (submitAction === 'draft') finalStatus = 'draft'
    if (submitAction === 'unpublish') finalStatus = 'draft'

    const data = new FormData()
    data.append('title', formData.title)
    data.append('excerpt', formData.excerpt)
    data.append('content', formData.content)
    data.append('is_pinned', formData.is_pinned)
    data.append('status', finalStatus)
    
    if (file) {
      data.append('featured_image', file)
    }

    try {
      if (isEditing) {
        await axios.put(`${import.meta.env.VITE_API_URL}/articles/${currentArticle.id}`, data, config)
        setSuccess(`Article successfully ${finalStatus === 'published' ? 'published' : 'saved as draft'}`)
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/articles`, data, config)
        setSuccess(`Article successfully ${finalStatus === 'published' ? 'published' : 'saved as draft'}`)
      }
      
      // Clear autosave on successful submit
      localStorage.removeItem('article_draft_autosave')
      
      resetForm()
      fetchArticles()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save article')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (article) => {
    setCurrentArticle(article)
    setFormData({
      title: article.title,
      excerpt: article.excerpt || '',
      content: article.content,
      is_pinned: article.is_pinned,
      status: article.status || 'draft'
    })
    setIsEditing(true)
    setFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this article? This action cannot be undone.')) return

    const token = localStorage.getItem('adminToken')
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/articles/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      // If we are currently editing the deleted article, reset the form
      if (currentArticle && currentArticle.id === id) {
        resetForm()
      }
      
      fetchArticles()
      setSuccess('Article deleted successfully')
    } catch (err) {
      setError('Failed to delete article')
    }
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setFile(null)
    setIsEditing(false)
    setCurrentArticle(null)
    setSubmitAction('')
    const fileInput = document.getElementById('image-upload')
    if (fileInput) fileInput.value = ''
  }

  return (
    <div className="scope-adminarticles admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Manage Articles &amp; Posts</h1>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="articles-grid">
          <div className="admin-form-section">
            <h2>{isEditing ? 'Edit Article' : 'Create New Article'}</h2>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-group">
              <label>Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleInputChange} required />
            </div>
            
            <div className="form-group">
              <label>
                Excerpt (Summary for Carousel)
                <span style={{ float: 'right', fontSize: '0.85em', color: formData.excerpt.length > 150 ? 'red' : '#666' }}>
                  {formData.excerpt.length} / 150
                </span>
              </label>
              <textarea 
                name="excerpt" 
                value={formData.excerpt} 
                onChange={handleInputChange} 
                rows="2" 
                maxLength={150}
              />
            </div>

            <div className="form-group">
              <label>Full Content *</label>
              <textarea name="content" value={formData.content} onChange={handleInputChange} rows="8" required />
            </div>

            <div className="form-group">
              <label>Featured Image</label>
              <input type="file" id="image-upload" accept="image/*" onChange={handleFileChange} />
              {currentArticle?.featured_image_url && !file && (
                <div className="current-image" style={{ marginTop: '0.5rem' }}>
                  <p style={{ margin: 0 }}>Current image: <a href={currentArticle.featured_image_url} target="_blank" rel="noreferrer">View</a></p>
                </div>
              )}
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" name="is_pinned" checked={formData.is_pinned} onChange={handleInputChange} />
                Pin to Hero Carousel
              </label>
            </div>

            <div className="form-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {isEditing ? (
                <>
                  <button type="submit" className="button button-primary" onClick={() => setSubmitAction('update')} disabled={loading}>
                    {loading ? 'Saving...' : 'Update'}
                  </button>
                  
                  {formData.status === 'draft' ? (
                    <button type="submit" className="button button-success" onClick={() => setSubmitAction('publish')} disabled={loading}>
                      Publish Live
                    </button>
                  ) : (
                    <button type="submit" className="button button-warning" onClick={() => setSubmitAction('unpublish')} disabled={loading}>
                      Unpublish (Draft)
                    </button>
                  )}
                  
                  <button type="button" className="button button-danger" onClick={() => handleDelete(currentArticle.id)} disabled={loading}>
                    Delete
                  </button>

                  <button type="button" className="button button-secondary" onClick={resetForm} disabled={loading}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button type="submit" className="button button-secondary" onClick={() => setSubmitAction('draft')} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button type="submit" className="button button-primary" onClick={() => setSubmitAction('publish')} disabled={loading}>
                    {loading ? 'Saving...' : 'Publish Live'}
                  </button>
                </>
              )}
            </div>
          </form>
          </div>

          <div className="admin-list-section">
            <h2>All Articles</h2>
            {loading && !articles.length ? (
              <p>Loading...</p>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Pinned</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map(article => (
                      <tr key={article.id}>
                        <td>{article.title}</td>
                        <td>
                          <span className={`status-badge status-${article.status || 'draft'}`}>
                            {(article.status || 'draft').toUpperCase()}
                          </span>
                        </td>
                        <td>{new Date(article.created_at).toLocaleDateString()}</td>
                        <td>{article.is_pinned ? 'Yes' : 'No'}</td>
                        <td>
                          <button onClick={() => handleEdit(article)} className="button button-small button-secondary">Edit</button>
                        </td>
                      </tr>
                    ))}
                    {articles.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center' }}>No articles found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
