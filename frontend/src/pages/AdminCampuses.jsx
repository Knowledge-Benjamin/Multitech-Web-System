import { useState } from 'react'
import axios from 'axios'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'
import './AdminProgrammes.css'

export default function AdminCampuses() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [file, setFile] = useState(null)
  const [formTab, setFormTab] = useState('basic') // basic, programmes

  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    map_embed_url: '',
    status: 'active',
    display_order: 0
  })

  const [selectedProgrammes, setSelectedProgrammes] = useState([])

  const token = localStorage.getItem('adminToken')

  const { data: campusesData, isLoading, refetch } = useApiQuery('/admin/campuses', 'adminCampuses', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })
  
  const { data: programmesData } = useApiQuery('/programmes', 'adminProgrammesList', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const campuses = campusesData?.data || []
  const allProgrammes = programmesData?.data || []

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleProgrammeToggle = (progId) => {
    setSelectedProgrammes(prev => 
      prev.includes(progId) ? prev.filter(id => id !== progId) : [...prev, progId]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = new FormData()
    for (const key in formData) {
      data.append(key, formData[key])
    }
    if (file) {
      data.append('featured_image', file)
    }

    try {
      let campusId = editingId
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/admin/campuses/${editingId}`, data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      } else {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/admin/campuses`, data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
        campusId = res.data.id || res.data.data?.id
      }

      if (campusId) {
        await axios.post(`${import.meta.env.VITE_API_URL}/admin/campuses/${campusId}/programmes`, {
          programme_ids: selectedProgrammes
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }

      resetForm()
      refetch()
    } catch (error) {
      console.error('Error saving campus:', error)
      alert('Error saving campus')
    }
  }

  const handleEdit = async (campus) => {
    setFormData({
      name: campus.name || '',
      tagline: campus.tagline || '',
      description: campus.description || '',
      address: campus.address || '',
      city: campus.city || '',
      phone: campus.phone || '',
      email: campus.email || '',
      map_embed_url: campus.map_embed_url || '',
      status: campus.status || 'active',
      display_order: campus.display_order || 0
    })
    setEditingId(campus.id)
    setFile(null)
    
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/campuses/${campus.slug || campus.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const progIds = (res.data.data?.programmes || []).map(p => p.id)
      setSelectedProgrammes(progIds)
    } catch (err) {
      console.error(err)
      setSelectedProgrammes([])
    }

    setFormTab('basic')
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this campus?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/admin/campuses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      refetch()
    } catch (error) {
      console.error('Error deleting campus:', error)
      alert('Error deleting campus')
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      name: '', tagline: '', description: '', address: '', city: '',
      phone: '', email: '', map_embed_url: '', status: 'active', display_order: 0
    })
    setFile(null)
    setSelectedProgrammes([])
    setFormTab('basic')
  }

  return (
    <div className="scope-admincampuses admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Manage Campuses</h1>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + Add Campus
            </button>
          )}
        </header>

        {showForm ? (
          <div className="form-container extended-form">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>{editingId ? 'Edit' : 'Add'} Campus</h2>
              <button onClick={resetForm} className="btn-secondary">Back to List</button>
            </div>

            <div className="form-tabs">
              <button type="button" className={formTab === 'basic' ? 'active' : ''} onClick={() => setFormTab('basic')} style={{ marginRight: '1rem', padding: '0.5rem 1rem', borderBottom: formTab === 'basic' ? '2px solid #0056b3' : 'none' }}>Basic Info</button>
              <button type="button" className={formTab === 'programmes' ? 'active' : ''} onClick={() => setFormTab('programmes')} style={{ padding: '0.5rem 1rem', borderBottom: formTab === 'programmes' ? '2px solid #0056b3' : 'none' }}>Offered Programmes</button>
            </div>

            <form onSubmit={handleSubmit} className="multi-tab-form" style={{ marginTop: '1.5rem' }}>
              {formTab === 'basic' && (
                <div className="tab-pane">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name *</label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label>Tagline</label>
                      <input type="text" name="tagline" value={formData.tagline} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows="4" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Address</label>
                      <input type="text" name="address" value={formData.address} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label>City</label>
                      <input type="text" name="city" value={formData.city} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone</label>
                      <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="form-group full-width">
                    <label>Map Embed URL</label>
                    <input type="text" name="map_embed_url" value={formData.map_embed_url} onChange={handleChange} placeholder="https://www.google.com/maps/embed?pb=..." />
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
                </div>
              )}

              {formTab === 'programmes' && (
                <div className="tab-pane">
                  <h3>Select Programmes Offered at this Campus</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    {allProgrammes.map(prog => (
                      <label key={prog.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid #eee', borderRadius: '4px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedProgrammes.includes(prog.id)} 
                          onChange={() => handleProgrammeToggle(prog.id)}
                        />
                        {prog.name} ({prog.level})
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-actions" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
                <button type="submit" className="btn-primary btn-large">
                  {editingId ? 'Save Changes' : 'Create Campus'}
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
            ) : campuses.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>City</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campuses.map((campus) => (
                    <tr key={campus.id}>
                      <td style={{ width: '80px' }}>
                        {campus.featured_image_url ? (
                          <img src={campus.featured_image_url} alt={campus.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <div style={{ width: '60px', height: '60px', backgroundColor: '#eee', borderRadius: '4px' }} />
                        )}
                      </td>
                      <td><strong>{campus.name}</strong></td>
                      <td>{campus.city}</td>
                      <td>{campus.status}</td>
                      <td className="actions">
                        <button onClick={() => handleEdit(campus)} className="btn-edit">Edit</button>
                        <button onClick={() => handleDelete(campus.id)} className="btn-delete">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">No campuses yet.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
