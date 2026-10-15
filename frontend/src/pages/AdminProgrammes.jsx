import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Calendar, CheckCircle, BookOpen } from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'
import './AdminProgrammes.css'

const getSuggestedLevel = (type) => {
  switch (type) {
    case 'undergraduate':
      return 'degree'
    case 'postgraduate':
      return 'masters'
    case 'diploma':
      return 'diploma'
    case 'professional':
    case 'shortcourses':
      return 'certificate'
    default:
      return ''
  }
}

export default function AdminProgrammes() {
  const [activeMainTab, setActiveMainTab] = useState('programmes')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [file, setFile] = useState(null)
  const [uploadingCategory, setUploadingCategory] = useState(null)
  
  // Form Tabs
  const [formTab, setFormTab] = useState('basic') // basic, requirements, fees_intake

  const [formData, setFormData] = useState({
    name: '',
    type: 'undergraduate',
    level: '',
    description: '',
    duration: '',
    capacity: '',
    requirements: '',
    career_prospects: '',
    is_supplementary: false,
    national_tuition_fee: '',
    international_tuition_fee: ''
  })
  
  // ── Course Units state ────────────────────────────────────────────────────
  const [cuError, setCuError] = useState('')
  const [cuSuccess, setCuSuccess] = useState('')
  const [cuForm, setCuForm] = useState({ programme_id: '', course_code: '', name: '', credits: 3, target_year: 1, target_semester: 1 })
  const [cuModules, setCuModules] = useState([])
  const [newCuModule, setNewCuModule] = useState('')
  const [cuEditId, setCuEditId] = useState(null)

  const navigate = useNavigate()

  const token = localStorage.getItem('adminToken')
  
  const { data: programmesData, isLoading: loadingProgrammes, refetch: fetchProgrammes } = useApiQuery('/programmes', 'adminProgrammes', {
    queryOptions: { enabled: activeMainTab === 'programmes' || activeMainTab === 'course_units' },
    axiosOptions: { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } }
  })
  
  const { data: categoriesData, isLoading: loadingCategories, refetch: fetchCategories } = useApiQuery('/programme-categories', 'adminCategories', {
    queryOptions: { enabled: activeMainTab === 'categories' }
  })
  
  const { data: cuData, isLoading: cuLoading, refetch: fetchCourseUnits } = useApiQuery('/course-units', 'adminCourseUnits', {
    queryOptions: { enabled: activeMainTab === 'course_units' },
    axiosOptions: { headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache' } }
  })

  const programmes = programmesData?.data || []
  const categories = categoriesData?.data || []
  const courseUnits = cuData?.data || []
  
  const loading = (activeMainTab === 'programmes' && loadingProgrammes) || 
                  (activeMainTab === 'categories' && loadingCategories)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    if (name === 'type') {
      setFormData(prev => ({
        ...prev,
        type: value,
        level: getSuggestedLevel(value)
      }))
      return
    }

    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
  }

  const handleAddCuModule = () => {
    if (newCuModule.trim()) {
      setCuModules([...cuModules, newCuModule.trim()])
      setNewCuModule('')
    }
  }

  const handleRemoveCuModule = (index) => {
    setCuModules(cuModules.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const data = new FormData()
    
    const submitData = {
      ...formData,
      capacity: formData.capacity === '' ? 50 : Number(formData.capacity) || 50,
      tuition_fee: formData.tuition_fee === '' ? '' : Number(formData.tuition_fee),
      national_tuition_fee: formData.national_tuition_fee === '' ? '' : Number(formData.national_tuition_fee),
      international_tuition_fee: formData.international_tuition_fee === '' ? '' : Number(formData.international_tuition_fee)
    }

    for (const key in submitData) {
      if (submitData[key] === '' || submitData[key] === null || submitData[key] === undefined) {
        continue
      }
      data.append(key, submitData[key])
    }
    if (file) {
      data.append('image', file)
    }

    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/programmes/${editingId}`, data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/programmes`, data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      }

      window.__multitechInvalidateCaches?.(['programmes'])
      window.localStorage.setItem('multitech:programmes-updated', String(Date.now()))
      window.dispatchEvent(new CustomEvent('multitech:programmes-updated'))
      resetForm()
      fetchProgrammes()
    } catch (error) {
      console.error('Error saving programme:', error)
      alert('Error saving programme')
    }
  }

  const handleEdit = (programme) => {
    setFormData({
      name: programme.name || '',
      type: programme.type || 'undergraduate',
      level: programme.level || '',
      description: programme.description || '',
      duration: programme.duration || '',
      capacity: programme.capacity || '',
      requirements: programme.requirements || '',
      career_prospects: programme.career_prospects || '',
      is_supplementary: programme.is_supplementary || false,
      national_tuition_fee: programme.national_tuition_fee || '',
      international_tuition_fee: programme.international_tuition_fee || ''
    })
    
    setEditingId(programme.id)
    setFile(null)
    setFormTab('basic')
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      name: '', type: 'undergraduate', level: '', description: '', duration: '', capacity: '',
      requirements: '', career_prospects: '',
      is_supplementary: false, national_tuition_fee: '', international_tuition_fee: ''
    })
    setFile(null)
    setFormTab('basic')
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this programme?')) return

    const token = localStorage.getItem('adminToken')
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/programmes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      window.__multitechInvalidateCaches?.(['programmes'])
      window.localStorage.setItem('multitech:programmes-updated', String(Date.now()))
      window.dispatchEvent(new CustomEvent('multitech:programmes-updated'))
      fetchProgrammes()
    } catch (error) {
      console.error('Error deleting programme:', error)
      alert('Error deleting programme')
    }
  }

  // course unit functions

  const handleCUSubmit = async (e) => {
    e.preventDefault()
    setCuError('')
    setCuSuccess('')
    
    const payload = { ...cuForm, modules: cuModules }

    try {
      if (cuEditId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/course-units/${cuEditId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setCuSuccess('Course unit updated successfully!')
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/course-units`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setCuSuccess('Course unit created successfully!')
      }
      setCuForm({ programme_id: '', course_code: '', name: '', credits: 3, target_year: 1, target_semester: 1 })
      setCuModules([])
      setCuEditId(null)
      fetchCourseUnits()
    } catch (err) {
      setCuError(err.response?.data?.message || 'Failed to save course unit')
    }
  }

  const handleCUEdit = (cu) => {
    setCuForm({
      programme_id: cu.programme_id,
      course_code: cu.course_code,
      name: cu.name,
      credits: cu.credits,
      target_year: cu.target_year,
      target_semester: cu.target_semester
    })
    setCuModules(cu.modules || [])
    setCuEditId(cu.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCUDelete = async (id) => {
    if (!window.confirm('Delete this course unit?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/course-units/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchCourseUnits()
    } catch (err) {
      setCuError('Failed to delete course unit.')
    }
  }

  const handleProgrammeImageUpload = async (e, programmeId) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingCategory(`prog_${programmeId}`)
    const formData = new FormData()
    formData.append('image', file)

    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/programmes/${programmeId}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      })
      fetchProgrammes()
      alert('Programme image uploaded successfully!')
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error uploading image')
    } finally {
      setUploadingCategory(null)
      e.target.value = null
    }
  }

  const handleImageUpload = async (e, categoryId) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingCategory(categoryId)
    const formData = new FormData()
    formData.append('image', file)

    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/programme-categories/${categoryId}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      })
      fetchCategories()
      alert('Image uploaded successfully!')
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image.')
    } finally {
      setUploadingCategory(null)
      e.target.value = null
    }
  }

  return (
    <div className="scope-adminprogrammes admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Manage Programmes</h1>
          {activeMainTab === 'programmes' && !showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + Add Programme
            </button>
          )}
        </header>

        {!showForm && (
          <div className="settings-tabs" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setActiveMainTab('programmes')}
              className={`tab-btn ${activeMainTab === 'programmes' ? 'active' : ''}`}
              style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeMainTab === 'programmes' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeMainTab === 'programmes' ? 'var(--color-primary)' : 'var(--color-text)', cursor: 'pointer', fontWeight: activeMainTab === 'programmes' ? '600' : '400' }}
            >
              Programmes
            </button>
            <button
              onClick={() => setActiveMainTab('course_units')}
              className={`tab-btn ${activeMainTab === 'course_units' ? 'active' : ''}`}
              style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeMainTab === 'course_units' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeMainTab === 'course_units' ? 'var(--color-primary)' : 'var(--color-text)', cursor: 'pointer', fontWeight: activeMainTab === 'course_units' ? '600' : '400' }}
            >
              Course Units
            </button>
            <button
              onClick={() => setActiveMainTab('categories')}
              className={`tab-btn ${activeMainTab === 'categories' ? 'active' : ''}`}
              style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeMainTab === 'categories' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeMainTab === 'categories' ? 'var(--color-primary)' : 'var(--color-text)', cursor: 'pointer', fontWeight: activeMainTab === 'categories' ? '600' : '400' }}
            >
              Homepage Cards UI
            </button>
          </div>
        )}

        {activeMainTab === 'programmes' ? (
          <>
            {showForm ? (
              <div className="form-container extended-form">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2>{editingId ? 'Edit' : 'Add'} Programme</h2>
                  <button onClick={resetForm} className="btn-secondary">Back to List</button>
                </div>
                
                <div className="form-tabs">
                  <button type="button" className={formTab === 'basic' ? 'active' : ''} onClick={() => setFormTab('basic')}>Basic Info</button>
                  <button type="button" className={formTab === 'requirements' ? 'active' : ''} onClick={() => setFormTab('requirements')}>Details & Curriculum</button>
                  <button type="button" className={formTab === 'fees_intake' ? 'active' : ''} onClick={() => setFormTab('fees_intake')}>Intake & Fees</button>
                </div>

                <form onSubmit={handleSubmit} className="multi-tab-form">
                  
                  {/* Basic Info Tab */}
                  {formTab === 'basic' && (
                    <div className="tab-pane">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Name *</label>
                          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                          <label>Type *</label>
                          <select name="type" value={formData.type} onChange={handleChange} required>
                            <option value="undergraduate">Undergraduate</option>
                            <option value="postgraduate">Postgraduate</option>
                            <option value="diploma">Diploma</option>
                            <option value="professional">Professional</option>
                            <option value="shortcourses">Short Courses</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Level *</label>
                          <input type="text" name="level" value={formData.level} onChange={handleChange} placeholder="e.g., degree, masters" required />
                          <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.35rem' }}>Suggested automatically from the selected type.</div>
                        </div>
                        <div className="form-group">
                          <label>Duration</label>
                          <input type="text" name="duration" value={formData.duration} onChange={handleChange} placeholder="e.g., 3 years" />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Capacity</label>
                          <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} placeholder="e.g. 50" min="1" />
                        </div>
                        <div className="form-group">
                          <label>&nbsp;</label>
                          <div style={{ color: '#6b7280', fontSize: '0.9rem', paddingTop: '0.45rem' }}>Leave blank to use a default value.</div>
                        </div>
                      </div>

                      <div className="form-group full-width">
                        <label>Overview / Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="4" placeholder="Brief overview of the programme" />
                      </div>

                      <div className="form-group">
                        <label>Programme Cover Image</label>
                        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
                      </div>
                    </div>
                  )}

                  {/* Requirements & Curriculum Tab */}
                  {formTab === 'requirements' && (
                    <div className="tab-pane">
                      <div className="form-group full-width">
                        <label>Admission Requirements</label>
                        <textarea name="requirements" value={formData.requirements} onChange={handleChange} rows="5" placeholder="List the admission requirements..." />
                      </div>
                      
                      <div className="form-group full-width">
                        <label>Career Prospects</label>
                        <textarea name="career_prospects" value={formData.career_prospects} onChange={handleChange} rows="4" placeholder="What careers does this lead to?" />
                      </div>
                    </div>
                  )}

                  {/* Fees & Intake Tab */}
                  {formTab === 'fees_intake' && (
                    <div className="tab-pane">

                      {/* Intake Info Banner */}
                      <div style={{ background: '#e8f4fd', border: '1px solid #bee3f8', borderRadius: '8px', padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                        <Calendar size={22} style={{ color: '#0284c7', marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Intake & Application Windows are managed via Intakes</strong>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>
                            This programme's availability for applications is controlled by the intakes it is linked to.
                            Open/close dates and application fees are set on a per-intake basis.
                            To link this programme to an intake or adjust dates, go to{' '}
                            <a href="/admin/intakes" style={{ color: '#0077cc', textDecoration: 'underline' }}>Manage Intakes</a>.
                          </p>
                        </div>
                      </div>

                      {/* Supplementary toggle — a programme-level flag */}
                      <div className="settings-section" style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                        <h3 style={{ marginTop: 0 }}>Programme Type</h3>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                          <input type="checkbox" name="is_supplementary" checked={formData.is_supplementary} onChange={handleChange} style={{ width: '18px', height: '18px', marginTop: '2px' }} />
                          <span>
                            <strong>Supplementary / Short Course</strong>
                            <small style={{ display: 'block', color: '#666', fontWeight: 'normal', marginTop: '0.2rem' }}>
                              Students can apply for this alongside an existing programme enrolment.
                            </small>
                          </span>
                        </label>
                      </div>

                      <div className="settings-section" style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0 }}>Tuition Fees</h3>
                        <div className="form-row">
                          <div className="form-group">
                            <label>National Tuition Fee (KES)</label>
                            <input type="number" name="national_tuition_fee" value={formData.national_tuition_fee} onChange={handleChange} placeholder="e.g. 1500000" />
                          </div>
                          <div className="form-group">
                            <label>International Tuition Fee (USD)</label>
                            <input type="number" name="international_tuition_fee" value={formData.international_tuition_fee} onChange={handleChange} placeholder="e.g. 1500" />
                          </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>Note: Functional fees and custom programme fees are managed separately and automatically added to the student's total.</p>
                      </div>
                    </div>
                  )}

                  <div className="form-actions" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
                    <button type="submit" className="btn-primary btn-large">
                      {editingId ? 'Save Changes' : 'Create Programme'}
                    </button>
                    <button type="button" onClick={resetForm} className="btn-secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="programmes-table">
                {loading ? (
                  <p>Loading...</p>
                ) : programmes.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programmes.map((prog) => (
                        <tr key={prog.id}>
                          <td style={{ width: '120px' }}>
                            <div style={{ position: 'relative', width: '100%', height: '60px', backgroundColor: '#f0f4f8', borderRadius: '4px', overflow: 'hidden' }}>
                              {prog.image_url ? (
                                <img src={prog.image_url} alt={prog.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.75rem', color: '#999' }}>No Image</span>
                              )}
                              <label style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', opacity: 0, cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>
                                  {uploadingCategory === `prog_${prog.id}` ? '...' : 'Upload'}
                                </span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleProgrammeImageUpload(e, prog.id)}
                                  disabled={uploadingCategory === `prog_${prog.id}`}
                                />
                              </label>
                            </div>
                          </td>
                          <td>
                            <strong>{prog.name}</strong>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>{prog.level}</div>
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>{prog.type}</td>
                          <td>
                            {prog.is_supplementary ? (
                              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                                Short Course
                              </span>
                            ) : (
                              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: '#f3f4f6', color: '#374151' }}>
                                Main Programme
                              </span>
                            )}
                          </td>
                          <td className="actions">
                            <button onClick={() => handleEdit(prog)} className="btn-edit">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(prog.id)} className="btn-delete">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="empty-state">No programmes yet. Create one to get started!</p>
                )}
              </div>
            )}
          </>
        ) : activeMainTab === 'course_units' ? (
          <div style={{ maxWidth: '900px' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#1e1b4b' }}>Course Units Management</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Add individual course units (subjects) that belong to a programme. These are what lecturers teach, exams are created for, and students are registered in.</p>

            {cuError && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '1rem' }}>{cuError}</div>}
            {cuSuccess && <div style={{ background: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} /> {cuSuccess}</div>}

            <form onSubmit={handleCUSubmit} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '2rem' }}>
              <h3 style={{ marginTop: 0, color: '#1e1b4b' }}>{cuEditId ? 'Edit Course Unit' : 'Add New Course Unit'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Programme *</label>
                  <select
                    value={cuForm.programme_id}
                    onChange={e => setCuForm({ ...cuForm, programme_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  >
                    <option value="">-- Select Programme --</option>
                    {programmes.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Course Code *</label>
                  <input
                    type="text"
                    value={cuForm.course_code}
                    onChange={e => setCuForm({ ...cuForm, course_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CS101"
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Credits</label>
                  <input type="number" min="1" max="10" value={cuForm.credits} onChange={e => setCuForm({ ...cuForm, credits: +e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Course Name *</label>
                  <input
                    type="text"
                    value={cuForm.name}
                    onChange={e => setCuForm({ ...cuForm, name: e.target.value })}
                    placeholder="e.g. Introduction to Computer Science"
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Year of Study</label>
                  <select value={cuForm.target_year} onChange={e => setCuForm({ ...cuForm, target_year: +e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}>
                    {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Semester</label>
                  <select value={cuForm.target_semester} onChange={e => setCuForm({ ...cuForm, target_semester: +e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}>
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </div>
                
                <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>Modules / Topics Outline (Optional)</label>
                  <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '12px' }}>List the syllabus topics covered in this course unit. These will be visible to students and act as a guide for lecturers.</p>
                  
                  <div className="add-item-row" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input 
                      type="text" 
                      value={newCuModule} 
                      onChange={(e) => setNewCuModule(e.target.value)} 
                      placeholder="e.g. Module 1: Introduction to Programming" 
                      onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddCuModule(); } }} 
                      style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem' }} 
                    />
                    <button type="button" onClick={handleAddCuModule} className="btn-secondary" style={{ padding: '0 20px', borderRadius: '8px' }}>Add Topic</button>
                  </div>
                  
                  {cuModules.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {cuModules.map((item, index) => (
                        <li key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #e5e7eb', marginBottom: '8px', borderRadius: '8px', background: '#f9fafb' }}>
                          <span style={{ fontSize: '0.9rem', color: '#374151' }}>{index + 1}. {item}</span>
                          <button type="button" onClick={() => handleRemoveCuModule(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>&times;</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="btn-primary">{cuEditId ? 'Update Unit' : 'Create Unit'}</button>
                {cuEditId && <button type="button" className="btn-secondary" onClick={() => { setCuEditId(null); setCuForm({ programme_id: '', course_code: '', name: '', credits: 3, target_year: 1, target_semester: 1 }); setCuModules([]); }}>Cancel Edit</button>}
              </div>
            </form>

            {cuLoading ? (
              <p>Loading course units...</p>
            ) : courseUnits.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Code</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Programme</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yr/Sem</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Credits</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courseUnits.map((unit, i) => (
                    <tr key={unit.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#6366f1', fontSize: '0.95rem' }}>{unit.course_code}</td>
                      <td style={{ padding: '12px 16px', color: '#1e293b' }}>
                        {unit.name}
                        {unit.modules && unit.modules.length > 0 && (
                          <span style={{ marginLeft: '8px', fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '12px' }}>
                            {unit.modules.length} Modules
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.875rem' }}>{unit.programme_name}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>Y{unit.target_year} S{unit.target_semester}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>{unit.credits}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button onClick={() => handleCUEdit(unit)} style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginRight: '8px', fontSize: '0.8rem' }}>Edit</button>
                        <button onClick={() => handleCUDelete(unit.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', color: '#9ca3af' }}>
                <BookOpen size={40} style={{ color: '#9ca3af', marginBottom: '0.5rem' }} />
                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No course units yet</p>
                <p style={{ fontSize: '0.875rem' }}>Use the form above to add course units to your programmes.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="categories-ui">
            <h2>Homepage Cards Configuration</h2>
            <p style={{ marginBottom: '2rem', color: 'var(--color-text-light)' }}>Manage the dynamic images that appear on the 4 programme cards on the public homepage.</p>
            
            {loading ? (
              <p>Loading categories...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {categories.map(cat => (
                  <div key={cat.id} style={{ border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white' }}>
                    <div style={{ height: '200px', backgroundColor: '#f0f4f8', position: 'relative' }}>
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-light)' }}>
                          No Image Uploaded
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: 'var(--color-secondary)' }}>{cat.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label className="btn-secondary" style={{ cursor: 'pointer', padding: '0.5rem 1rem', display: 'inline-block', opacity: uploadingCategory === cat.id ? 0.5 : 1 }}>
                          {uploadingCategory === cat.id ? 'Uploading...' : 'Replace Image'}
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }}
                            onChange={(e) => handleImageUpload(e, cat.id)}
                            disabled={uploadingCategory === cat.id}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
