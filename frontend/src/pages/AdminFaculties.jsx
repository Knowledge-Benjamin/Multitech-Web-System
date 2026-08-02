import { useState } from 'react'
import axios from 'axios'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'
import './AdminProgrammes.css'

export default function AdminFaculties() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [file, setFile] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dean_name: '',
    status: 'active',
    display_order: 0
  })

  const token = localStorage.getItem('adminToken')

  const { data: facultiesData, isLoading, refetch } = useApiQuery('/admin/faculties', 'adminFaculties', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const faculties = facultiesData?.data || []

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = new FormData()
    for (const key in formData) {
      data.append(key, formData[key])
    }
    if (file) {
      data.append('image', file)
    }

    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/admin/faculties/${editingId}`, data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/admin/faculties`, data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      }
      resetForm()
      refetch()
    } catch (error) {
      console.error('Error saving faculty:', error)
      alert('Error saving faculty')
    }
  }

  const handleEdit = (faculty) => {
    setFormData({
      name: faculty.name || '',
      description: faculty.description || '',
      dean_name: faculty.dean_name || '',
      status: faculty.status || 'active',
      display_order: faculty.display_order || 0
    })
    setEditingId(faculty.id)
    setFile(null)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this faculty?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/admin/faculties/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      refetch()
    } catch (error) {
      console.error('Error deleting faculty:', error)
      alert('Error deleting faculty')
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', description: '', dean_name: '', status: 'active', display_order: 0 })
    setFile(null)
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Manage Faculties</h1>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + Add Faculty
            </button>
          )}
        </header>

        {showForm ? (
          <div className="form-container extended-form">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>{editingId ? 'Edit' : 'Add'} Faculty</h2>
              <button onClick={resetForm} className="btn-secondary">Back to List</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Dean Name</label>
                  <input type="text" name="dean_name" value={formData.dean_name} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group full-width">
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="4" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Display Order</label>
                  <input type="number" name="display_order" value={formData.display_order} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Featured Image</label>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
              </div>
              <div className="form-actions" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
                <button type="submit" className="btn-primary btn-large">
                  {editingId ? 'Save Changes' : 'Create Faculty'}
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="programmes-table">
            {isLoading ? (
              <p>Loading...</p>
            ) : faculties.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Dean</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {faculties.map((fac) => (
                    <tr key={fac.id}>
                      <td style={{ width: '80px' }}>
                        {fac.featured_image_url ? (
                          <img src={fac.featured_image_url} alt={fac.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <div style={{ width: '60px', height: '60px', backgroundColor: '#eee', borderRadius: '4px' }} />
                        )}
                      </td>
                      <td><strong>{fac.name}</strong></td>
                      <td>{fac.dean_name}</td>
                      <td>{fac.status}</td>
                      <td className="actions">
                        <button onClick={() => handleEdit(fac)} className="btn-edit">Edit</button>
                        <button onClick={() => handleDelete(fac.id)} className="btn-delete">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">No faculties yet.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
