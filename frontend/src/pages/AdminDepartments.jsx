import { useState } from 'react'
import axios from 'axios'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'
import './AdminProgrammes.css'

export default function AdminDepartments() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    faculty_id: '',
    description: '',
    hod_name: '',
    status: 'active',
    display_order: 0
  })

  const token = localStorage.getItem('adminToken')

  const { data: deptsData, isLoading, refetch } = useApiQuery('/admin/departments', 'adminDepartments', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })
  
  const { data: facultiesData } = useApiQuery('/admin/faculties', 'adminFacultiesDropdown', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const departments = deptsData?.data || []
  const faculties = facultiesData?.data || []

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/admin/departments/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/admin/departments`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      resetForm()
      refetch()
    } catch (error) {
      console.error('Error saving department:', error)
      alert('Error saving department')
    }
  }

  const handleEdit = (dept) => {
    setFormData({
      name: dept.name || '',
      faculty_id: dept.faculty_id || '',
      description: dept.description || '',
      hod_name: dept.hod_name || '',
      status: dept.status || 'active',
      display_order: dept.display_order || 0
    })
    setEditingId(dept.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this department?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/admin/departments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      refetch()
    } catch (error) {
      console.error('Error deleting department:', error)
      alert('Error deleting department')
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', faculty_id: '', description: '', hod_name: '', status: 'active', display_order: 0 })
  }

  const getFacultyName = (id) => {
    const f = faculties.find(fac => fac.id === id || fac.id === Number(id))
    return f ? f.name : ''
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Manage Departments</h1>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + Add Department
            </button>
          )}
        </header>

        {showForm ? (
          <div className="form-container extended-form">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>{editingId ? 'Edit' : 'Add'} Department</h2>
              <button onClick={resetForm} className="btn-secondary">Back to List</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Faculty *</label>
                  <select name="faculty_id" value={formData.faculty_id} onChange={handleChange} required>
                    <option value="">-- Select Faculty --</option>
                    {faculties.map(fac => (
                      <option key={fac.id} value={fac.id}>{fac.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group full-width">
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="4" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>HOD Name</label>
                  <input type="text" name="hod_name" value={formData.hod_name} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Display Order</label>
                <input type="number" name="display_order" value={formData.display_order} onChange={handleChange} />
              </div>
              <div className="form-actions" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
                <button type="submit" className="btn-primary btn-large">
                  {editingId ? 'Save Changes' : 'Create Department'}
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
            ) : departments.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Faculty</th>
                    <th>HOD</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id}>
                      <td><strong>{dept.name}</strong></td>
                      <td>{getFacultyName(dept.faculty_id)}</td>
                      <td>{dept.hod_name}</td>
                      <td>{dept.status}</td>
                      <td className="actions">
                        <button onClick={() => handleEdit(dept)} className="btn-edit">Edit</button>
                        <button onClick={() => handleDelete(dept.id)} className="btn-delete">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">No departments yet.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
