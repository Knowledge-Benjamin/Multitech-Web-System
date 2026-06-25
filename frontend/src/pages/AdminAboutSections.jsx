import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'
import './AdminArticles.css'

export default function AdminAboutSections() {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [currentSection, setCurrentSection] = useState(null)
  const [staffMembers, setStaffMembers] = useState([])

  const initialFormData = {
    title: '',
    description: '',
    content: '',
    section_type: 'standard',
    status: 'draft',
    display_order: 0
  }

  const [formData, setFormData] = useState(initialFormData)
    const [avatarUploadingIndex, setAvatarUploadingIndex] = useState(null)

  useEffect(() => {
    fetchSections()
  }, [])

  const fetchSections = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/about/admin/sections`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSections(res.data.data)
    } catch (err) {
      setError('Failed to load About sections')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const token = localStorage.getItem('adminToken')
    const config = { headers: { Authorization: `Bearer ${token}` } }
    const data = {
      title: formData.title,
      description: formData.description,
      content: formData.content,
      section_type: formData.section_type,
      metadata: formData.section_type === 'staff' ? { staff_members: staffMembers } : {},
      status: formData.status,
      display_order: parseInt(formData.display_order, 10) || 0
    }

    try {
      if (isEditing) {
        await axios.put(`${import.meta.env.VITE_API_URL}/about/admin/sections/${currentSection.id}`, data, config)
        setSuccess('Section updated successfully')
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/about/admin/sections`, data, config)
        setSuccess('Section created successfully')
      }
      resetForm()
      fetchSections()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save section')
    } finally {
      setLoading(false)
    }
  }

  const handleSectionTypeChange = (e) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, section_type: value }))
    if (value !== 'staff') {
      setStaffMembers([])
    }
  }

  const handleStaffMemberChange = (index, key, value) => {
    setStaffMembers(prev => prev.map((member, idx) => idx === index ? { ...member, [key]: value } : member))
  }

  const handleStaffAvatarChange = async (index, file) => {
    if (!file) return
    setAvatarUploadingIndex(index)
    setStaffMembers(prev => prev.map((member, idx) => idx === index ? { ...member, avatarFile: file } : member))

    try {
      const token = localStorage.getItem('adminToken')
      const formDataUpload = new FormData()
      formDataUpload.append('avatar', file)
      const uploadRes = await axios.post(
        `${import.meta.env.VITE_API_URL}/about/admin/sections/upload-avatar`,
        formDataUpload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      const { url, fileId } = uploadRes.data.data
      setStaffMembers(prev => prev.map((member, idx) => idx === index ? {
        ...member,
        image_url: url,
        file_id: fileId,
        avatarFile: null
      } : member))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload staff avatar')
      setStaffMembers(prev => prev.map((member, idx) => idx === index ? { ...member, avatarFile: null } : member))
    } finally {
      setAvatarUploadingIndex(null)
    }
  }

  const addStaffMember = () => {
    setStaffMembers(prev => ([
      ...prev,
      { name: '', role: '', bio: '', image_url: '', file_id: '', avatarFile: null }
    ]))
  }

  const removeStaffMember = (index) => {
    setStaffMembers(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleEdit = (section) => {
    setCurrentSection(section)
    setFormData({
      title: section.title,
      description: section.description || '',
      content: section.content || '',
      section_type: section.section_type || 'standard',
      status: section.status || 'draft',
      display_order: section.display_order || 0
    })
    setStaffMembers((section.metadata?.staff_members || []).map(member => ({
      ...member,
      avatarFile: null
    })))
    setIsEditing(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this section? This action cannot be undone.')) return
    const token = localStorage.getItem('adminToken')
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/about/admin/sections/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (currentSection?.id === id) {
        resetForm()
      }
      fetchSections()
      setSuccess('Section deleted successfully')
    } catch (err) {
      setError('Failed to delete section')
    }
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setCurrentSection(null)
    setIsEditing(false)
    setStaffMembers([])
    setAvatarUploadingIndex(null)
    setError('')
    setSuccess('')
  }


  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Manage About Page Sections</h1>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="admin-form-section">
          <h2>{isEditing ? 'Edit Section' : 'Create New Section'}</h2>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label>Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleInputChange} required />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows="2" />
            </div>

            <div className="form-group">
              <label>Content *</label>
              <textarea name="content" value={formData.content} onChange={handleInputChange} rows="6" required />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div className="form-group">
              <label>Section type</label>
              <select name="section_type" value={formData.section_type} onChange={handleSectionTypeChange}>
                <option value="standard">Standard</option>
                <option value="staff">Our Staff</option>
              </select>
            </div>

            {formData.section_type === 'staff' && (
              <div className="staff-members-section">
                <h3>Staff Members</h3>
                {staffMembers.map((member, index) => (
                  <div key={index} className="staff-member-card">
                    <div className="form-group">
                      <label>Name</label>
                      <input type="text" value={member.name} onChange={(e) => handleStaffMemberChange(index, 'name', e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Role</label>
                      <input type="text" value={member.role} onChange={(e) => handleStaffMemberChange(index, 'role', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Bio</label>
                      <textarea value={member.bio} onChange={(e) => handleStaffMemberChange(index, 'bio', e.target.value)} rows="3" />
                    </div>
                    <div className="form-group">
                      <label>Avatar</label>
                      <input type="file" accept="image/*" onChange={(e) => handleStaffAvatarChange(index, e.target.files[0])} />
                      {(member.image_url || member.avatarFile) && (
                        <div className="current-image" style={{ marginTop: '0.5rem' }}>
                          <p style={{ margin: 0 }}>Current avatar:</p>
                          <img src={member.avatarFile ? URL.createObjectURL(member.avatarFile) : member.image_url} alt={member.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '16px', marginTop: '0.5rem' }} />
                        </div>
                      )}
                    </div>
                    <button type="button" className="button button-danger" onClick={() => removeStaffMember(index)}>Remove Member</button>
                  </div>
                ))}
                <button type="button" className="button button-secondary" onClick={addStaffMember}>Add Staff Member</button>
              </div>
            )}

            <div className="form-group">
              <label>Display order</label>
              <input type="number" name="display_order" value={formData.display_order} onChange={handleInputChange} />
            </div>

            <div className="form-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="submit" className="button button-primary" disabled={loading}>{loading ? 'Saving...' : isEditing ? 'Update Section' : 'Create Section'}</button>
              {isEditing && (
                <button type="button" className="button button-secondary" onClick={resetForm} disabled={loading}>Cancel</button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-list-section">
          <h2>Existing Sections</h2>
          {loading && !sections.length ? (
            <p>Loading sections...</p>
          ) : (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Order</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map(section => (
                    <tr key={section.id}>
                      <td>{section.title}</td>
                      <td>{section.status}</td>
                      <td>{section.display_order}</td>
                      <td>{new Date(section.updated_at).toLocaleDateString()}</td>
                      <td>
                        <button className="button button-small button-secondary" type="button" onClick={() => handleEdit(section)}>Edit</button>
                        <button className="button button-small button-danger" type="button" onClick={() => handleDelete(section.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {sections.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center' }}>No sections found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
