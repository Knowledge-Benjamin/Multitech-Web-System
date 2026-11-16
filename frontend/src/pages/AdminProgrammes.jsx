import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle,
  Image,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X
} from 'lucide-react'
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

const formatProgrammeType = (type) => (
  type === 'shortcourses'
    ? 'Short courses'
    : (type || 'Programme').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
)

export default function AdminProgrammes() {
  const [activeMainTab, setActiveMainTab] = useState('programmes')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [file, setFile] = useState(null)
  const [uploadingCategory, setUploadingCategory] = useState(null)
  const [programmeSearch, setProgrammeSearch] = useState('')
  const [programmeTypeFilter, setProgrammeTypeFilter] = useState('all')
  const [courseUnitSearch, setCourseUnitSearch] = useState('')
  const [pageError, setPageError] = useState('')
  const [pageNotice, setPageNotice] = useState('')
  const [savingProgramme, setSavingProgramme] = useState(false)
  const programmeFormRef = useRef(null)
  
  // Form Tabs
  const [formTab, setFormTab] = useState('basic') // basic, requirements, fees_intake

  const [formData, setFormData] = useState({
    name: '',
    type: 'undergraduate',
    level: '',
    description: '',
    duration: '',
    capacity: '',
    active: true,
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

  const token = localStorage.getItem('adminToken')
  
  const {
    data: programmesData,
    isLoading: loadingProgrammes,
    isError: programmesLoadFailed,
    error: programmesLoadError,
    refetch: fetchProgrammes
  } = useApiQuery('/programmes/admin/all', 'adminProgrammes', {
    queryOptions: { enabled: activeMainTab === 'programmes' || activeMainTab === 'course_units' },
    axiosOptions: { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } }
  })
  
  const {
    data: categoriesData,
    isLoading: loadingCategories,
    isError: categoriesLoadFailed,
    error: categoriesLoadError,
    refetch: fetchCategories
  } = useApiQuery('/programme-categories', 'adminCategories', {
    queryOptions: { enabled: activeMainTab === 'categories' }
  })
  
  const {
    data: cuData,
    isLoading: cuLoading,
    isError: cuLoadFailed,
    error: cuLoadError,
    refetch: fetchCourseUnits
  } = useApiQuery('/course-units', 'adminCourseUnits', {
    queryOptions: { enabled: activeMainTab === 'course_units' },
    axiosOptions: { headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache' } }
  })

  const programmes = programmesData?.data || []
  const categories = categoriesData?.data || []
  const courseUnits = cuData?.data || []
  const filteredCourseUnits = courseUnits.filter((unit) => {
    const query = courseUnitSearch.trim().toLowerCase()
    return !query
      || unit.course_code?.toLowerCase().includes(query)
      || unit.name?.toLowerCase().includes(query)
      || unit.programme_name?.toLowerCase().includes(query)
  })
  
  const filteredProgrammes = programmes.filter((programme) => {
    const query = programmeSearch.trim().toLowerCase()
    const matchesSearch = !query
      || programme.name?.toLowerCase().includes(query)
      || programme.level?.toLowerCase().includes(query)
      || programme.type?.toLowerCase().includes(query)
    return matchesSearch && (programmeTypeFilter === 'all' || programme.type === programmeTypeFilter)
  })

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

  const handleFormTabChange = (nextTab) => {
    if (formTab === 'basic' && nextTab !== 'basic' && !programmeFormRef.current?.reportValidity()) {
      return
    }
    setPageError('')
    setFormTab(nextTab)
  }

  const invalidateProgrammeCache = () => {
    window.__multitechInvalidateCaches?.(['programmes'])
    window.localStorage.setItem('multitech:programmes-updated', String(Date.now()))
    window.dispatchEvent(new CustomEvent('multitech:programmes-updated'))
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
    setPageError('')
    setPageNotice('')
    setSavingProgramme(true)
    
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

      invalidateProgrammeCache()
      resetForm()
      fetchProgrammes()
    } catch (error) {
      console.error('Error saving programme:', error)
      setPageError(error.response?.data?.message || 'The programme could not be saved. Please try again.')
    } finally {
      setSavingProgramme(false)
    }
  }

  const handleEdit = (programme) => {
    setPageError('')
    setPageNotice('')
    setFormData({
      name: programme.name || '',
      type: programme.type || 'undergraduate',
      level: programme.level || '',
      description: programme.description || '',
      duration: programme.duration || '',
      capacity: programme.capacity || '',
      active: programme.active ?? true,
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
    setPageError('')
    setFormData({
      name: '', type: 'undergraduate', level: '', description: '', duration: '', capacity: '', active: true,
      requirements: '', career_prospects: '',
      is_supplementary: false, national_tuition_fee: '', international_tuition_fee: ''
    })
    setFile(null)
    setFormTab('basic')
  }

  const handleDelete = async (programme) => {
    if (!window.confirm(`Delete "${programme.name}"? This cannot be undone.`)) return

    const token = localStorage.getItem('adminToken')
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/programmes/${programme.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      invalidateProgrammeCache()
      fetchProgrammes()
      setPageNotice('Programme deleted.')
      setPageError('')
    } catch (error) {
      console.error('Error deleting programme:', error)
      setPageError(error.response?.data?.message || 'The programme could not be deleted.')
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
      invalidateProgrammeCache()
      fetchProgrammes()
      setPageNotice('Programme image updated.')
      setPageError('')
    } catch (error) {
      console.error('Error uploading image:', error)
      setPageError(error.response?.data?.message || 'The programme image could not be uploaded.')
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
      setPageNotice('Homepage card image updated.')
      setPageError('')
    } catch (error) {
      console.error('Error uploading image:', error)
      setPageError(error.response?.data?.message || 'The homepage card image could not be uploaded.')
    } finally {
      setUploadingCategory(null)
      e.target.value = null
    }
  }

  return (
    <div className="scope-adminprogrammes admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="admin-programmes-header">
          <div className="admin-programmes-heading">
            <p className="admin-programmes-eyebrow">Academic catalogue</p>
            <h1>
              {showForm
                ? `${editingId ? 'Edit' : 'Add'} programme`
                : activeMainTab === 'programmes'
                  ? <>Programmes <em>and courses</em></>
                  : activeMainTab === 'course_units'
                    ? <>Course <em>units</em></>
                    : <>Homepage <em>cards</em></>}
            </h1>
            <p className="admin-programmes-subtitle">
              {showForm
                ? 'Keep programme information clear, complete, and ready to publish.'
                : activeMainTab === 'programmes'
                  ? 'Manage the programmes available across the Multitech catalogue.'
                  : activeMainTab === 'course_units'
                    ? 'Organise the subjects, credits, and topics that make up each programme.'
                    : 'Refresh the imagery used in the homepage programme cards.'}
            </p>
          </div>
          {activeMainTab === 'programmes' && !showForm && (
            <button
              type="button"
              onClick={() => {
                setPageError('')
                setPageNotice('')
                setShowForm(true)
              }}
              className="programme-primary-button"
            >
              <Plus size={17} />
              Add programme
            </button>
          )}
          {showForm && (
            <button type="button" onClick={resetForm} className="programme-back-button">
              <ArrowLeft size={16} />
              Back to programmes
            </button>
          )}
        </header>

        {pageError && (
          <div className="programme-feedback programme-feedback--error" role="alert">
            <span>{pageError}</span>
            <button type="button" onClick={() => setPageError('')} aria-label="Dismiss error"><X size={16} /></button>
          </div>
        )}
        {pageNotice && (
          <div className="programme-feedback programme-feedback--success" role="status">
            <span>{pageNotice}</span>
            <button type="button" onClick={() => setPageNotice('')} aria-label="Dismiss notification"><X size={16} /></button>
          </div>
        )}

        {!showForm && (
          <nav className="settings-tabs" aria-label="Programme management sections">
            <button
              type="button"
              onClick={() => {
                setActiveMainTab('programmes')
                setPageError('')
                setPageNotice('')
              }}
              className={`programme-tab ${activeMainTab === 'programmes' ? 'active' : ''}`}
              aria-pressed={activeMainTab === 'programmes'}
            >
              Programmes {programmesData && <span>{programmes.length}</span>}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMainTab('course_units')
                setPageError('')
                setPageNotice('')
              }}
              className={`programme-tab ${activeMainTab === 'course_units' ? 'active' : ''}`}
              aria-pressed={activeMainTab === 'course_units'}
            >
              Course units {cuData && <span>{courseUnits.length}</span>}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMainTab('categories')
                setPageError('')
                setPageNotice('')
              }}
              className={`programme-tab ${activeMainTab === 'categories' ? 'active' : ''}`}
              aria-pressed={activeMainTab === 'categories'}
            >
              Homepage cards {categoriesData && <span>{categories.length}</span>}
            </button>
          </nav>
        )}

        {activeMainTab === 'programmes' ? (
          <>
            {showForm ? (
              <div className="form-container extended-form programme-form-panel">
                <div className="programme-form-heading">
                  <div>
                    <p className="admin-programmes-eyebrow">{editingId ? 'Update listing' : 'New listing'}</p>
                    <h2>{editingId ? 'Programme details' : 'Create a programme'}</h2>
                    <p>Complete each step, then review the details before saving.</p>
                  </div>
                </div>
                
                <div className="form-tabs" aria-label="Programme form steps">
                  <button type="button" className={formTab === 'basic' ? 'active' : ''} aria-pressed={formTab === 'basic'} onClick={() => handleFormTabChange('basic')}>
                    <span>01</span> Basic information
                  </button>
                  <button type="button" className={formTab === 'requirements' ? 'active' : ''} aria-pressed={formTab === 'requirements'} onClick={() => handleFormTabChange('requirements')}>
                    <span>02</span> Requirements
                  </button>
                  <button type="button" className={formTab === 'fees_intake' ? 'active' : ''} aria-pressed={formTab === 'fees_intake'} onClick={() => handleFormTabChange('fees_intake')}>
                    <span>03</span> Fees &amp; intake
                  </button>
                </div>

                <form ref={programmeFormRef} onSubmit={handleSubmit} className="multi-tab-form">
                  
                  {/* Basic Info Tab */}
                  {formTab === 'basic' && (
                    <div className="tab-pane">
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="programme-name">Programme name *</label>
                          <input id="programme-name" type="text" name="name" value={formData.name} onChange={handleChange} required autoComplete="off" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="programme-type">Programme type *</label>
                          <select id="programme-type" name="type" value={formData.type} onChange={handleChange} required>
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
                          <label htmlFor="programme-level">Award or level *</label>
                          <input id="programme-level" type="text" name="level" value={formData.level} onChange={handleChange} placeholder="For example, bachelor’s degree" required />
                          <small className="programme-field-hint">Suggested from the selected programme type; you can edit it.</small>
                        </div>
                        <div className="form-group">
                          <label htmlFor="programme-duration">Duration</label>
                          <input id="programme-duration" type="text" name="duration" value={formData.duration} onChange={handleChange} placeholder="For example, 3 years" />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="programme-capacity">Intake capacity</label>
                          <input id="programme-capacity" type="number" name="capacity" value={formData.capacity} onChange={handleChange} placeholder="Default: 50" min="1" />
                          <small className="programme-field-hint">Leave blank to use the default capacity of 50.</small>
                        </div>
                      </div>

                      <div className="form-group full-width">
                        <label htmlFor="programme-description">Programme overview</label>
                        <textarea id="programme-description" name="description" value={formData.description} onChange={handleChange} rows="4" placeholder="Describe what students will learn and what makes this programme distinct." />
                      </div>

                      <div className="form-group full-width">
                        <label htmlFor="programme-cover">Programme cover image</label>
                        <label className="programme-file-picker" htmlFor="programme-cover">
                          <span className="programme-file-icon"><Image size={20} /></span>
                          <span>
                            <strong>{file?.name || 'Choose a cover image'}</strong>
                            <small>JPG, PNG or WebP · maximum 5 MB</small>
                          </span>
                          <Upload size={17} />
                        </label>
                        <input id="programme-cover" className="programme-file-input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
                      </div>
                    </div>
                  )}

                  {/* Requirements & Curriculum Tab */}
                  {formTab === 'requirements' && (
                    <div className="tab-pane">
                      <div className="form-group full-width">
                        <label htmlFor="programme-requirements">Admission requirements</label>
                        <textarea id="programme-requirements" name="requirements" value={formData.requirements} onChange={handleChange} rows="5" placeholder="List the academic qualifications or other entry requirements." />
                      </div>
                      
                      <div className="form-group full-width">
                        <label htmlFor="programme-careers">Career prospects</label>
                        <textarea id="programme-careers" name="career_prospects" value={formData.career_prospects} onChange={handleChange} rows="4" placeholder="Describe relevant career paths for graduates." />
                      </div>
                    </div>
                  )}

                  {/* Fees & Intake Tab */}
                  {formTab === 'fees_intake' && (
                    <div className="tab-pane">
                      <div className="programme-info-note">
                        <Calendar size={20} />
                        <div>
                          <strong>Intake dates and application fees</strong>
                          <p>
                            These are managed per intake. Link this programme or adjust its application window in{' '}
                            <Link to="/admin/intakes">Intakes <ArrowRight size={14} /></Link>.
                          </p>
                        </div>
                      </div>

                      <div className="programme-settings-card">
                        <h3>Programme classification</h3>
                        <label className="programme-checkbox-row">
                          <input type="checkbox" name="is_supplementary" checked={formData.is_supplementary} onChange={handleChange} />
                          <span>
                            <strong>Supplementary programme</strong>
                            <small>Allows students to apply alongside an existing programme enrolment.</small>
                          </span>
                        </label>
                      </div>

                      <div className="programme-settings-card">
                        <h3>Tuition fees</h3>
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="national-tuition-fee">National tuition fee (UGX)</label>
                            <input id="national-tuition-fee" type="number" name="national_tuition_fee" value={formData.national_tuition_fee} onChange={handleChange} min="0" step="0.01" placeholder="Enter amount in UGX" />
                          </div>
                          <div className="form-group">
                            <label htmlFor="international-tuition-fee">International tuition fee (USD)</label>
                            <input id="international-tuition-fee" type="number" name="international_tuition_fee" value={formData.international_tuition_fee} onChange={handleChange} min="0" step="0.01" placeholder="Enter amount in USD" />
                          </div>
                        </div>
                        <p className="programme-field-hint">Functional and custom programme fees are managed separately.</p>
                      </div>

                      {editingId && (
                        <div className="programme-settings-card">
                          <h3>Catalogue visibility</h3>
                          <label className="programme-checkbox-row">
                            <input type="checkbox" name="active" checked={formData.active} onChange={handleChange} />
                            <span>
                              <strong>Published in the public catalogue</strong>
                              <small>Turn this off to hide the programme without deleting its records.</small>
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="form-actions programme-form-actions">
                    {formTab !== 'basic' && (
                      <button
                        type="button"
                        className="programme-back-button"
                        onClick={() => setFormTab(formTab === 'fees_intake' ? 'requirements' : 'basic')}
                      >
                        <ArrowLeft size={16} />
                        Previous
                      </button>
                    )}
                    {formTab !== 'fees_intake' ? (
                      <button
                        type="button"
                        className="programme-primary-button"
                        onClick={() => handleFormTabChange(formTab === 'basic' ? 'requirements' : 'fees_intake')}
                      >
                        Continue
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <button type="submit" className="programme-primary-button" disabled={savingProgramme}>
                        {savingProgramme ? 'Saving…' : editingId ? 'Save changes' : 'Create programme'}
                      </button>
                    )}
                    <button type="button" onClick={resetForm} className="programme-cancel-button">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <section className="programme-catalog-panel" aria-labelledby="programme-catalog-title">
                <div className="programme-catalog-heading">
                  <div>
                    <p className="admin-programmes-eyebrow">Catalogue</p>
                    <h2 id="programme-catalog-title">All programmes <span>{programmes.length}</span></h2>
                    <p>Search the full catalogue, including unpublished programmes.</p>
                  </div>
                  <div className="programme-filters">
                    <label className="programme-search">
                      <Search size={17} aria-hidden="true" />
                      <span className="programmes-sr-only">Search programmes</span>
                      <input
                        type="search"
                        value={programmeSearch}
                        onChange={(event) => setProgrammeSearch(event.target.value)}
                        placeholder="Search by name, type, or level"
                      />
                      {programmeSearch && (
                        <button type="button" onClick={() => setProgrammeSearch('')} aria-label="Clear search">
                          <X size={15} />
                        </button>
                      )}
                    </label>
                    <label className="programme-type-filter">
                      <span className="programmes-sr-only">Filter by programme type</span>
                      <select value={programmeTypeFilter} onChange={(event) => setProgrammeTypeFilter(event.target.value)}>
                        <option value="all">All types</option>
                        <option value="undergraduate">Undergraduate</option>
                        <option value="postgraduate">Postgraduate</option>
                        <option value="diploma">Diploma</option>
                        <option value="professional">Professional</option>
                        <option value="shortcourses">Short courses</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div className="programme-results-summary" aria-live="polite">
                  Showing {filteredProgrammes.length} of {programmes.length} programmes
                </div>
                {loadingProgrammes ? (
                  <div className="programme-state" role="status"><span className="programme-spinner" /> Loading programmes…</div>
                ) : programmesLoadFailed ? (
                  <div className="programme-state programme-state--error" role="alert">
                    <p>{programmesLoadError?.response?.data?.message || 'Programmes could not be loaded.'}</p>
                    <button type="button" className="programme-secondary-button" onClick={() => fetchProgrammes()}>Try again</button>
                  </div>
                ) : filteredProgrammes.length > 0 ? (
                  <div className="programmes-table">
                    <table className="admin-programme-table">
                      <thead>
                        <tr>
                          <th scope="col">Programme</th>
                          <th scope="col">Type</th>
                          <th scope="col">Capacity</th>
                          <th scope="col">Status</th>
                          <th scope="col"><span className="programmes-sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProgrammes.map((prog) => (
                          <tr key={prog.id}>
                            <td>
                              <div className="programme-identity">
                                <div className="programme-thumb">
                                  {prog.image_url ? (
                                    <img src={prog.image_url} alt="" loading="lazy" />
                                  ) : (
                                    <Image size={20} aria-hidden="true" />
                                  )}
                                  <label className="programme-image-upload" htmlFor={`programme-image-${prog.id}`} title={`Upload an image for ${prog.name}`}>
                                    <Upload size={15} />
                                    <span>{uploadingCategory === `prog_${prog.id}` ? 'Uploading…' : 'Change image'}</span>
                                    <input
                                      id={`programme-image-${prog.id}`}
                                      className="programme-file-input"
                                      type="file"
                                      accept="image/*"
                                      onChange={(event) => handleProgrammeImageUpload(event, prog.id)}
                                      disabled={uploadingCategory === `prog_${prog.id}`}
                                    />
                                  </label>
                                </div>
                                <div className="programme-identity-copy">
                                  <strong>{prog.name}</strong>
                                  <span>{prog.level || 'Level not set'}{prog.duration ? ` · ${prog.duration}` : ''}</span>
                                  {prog.is_supplementary && <small className="programme-supplementary-pill">Supplementary</small>}
                                </div>
                              </div>
                            </td>
                            <td><span className="programme-type-pill">{formatProgrammeType(prog.type)}</span></td>
                            <td className="programme-capacity">{prog.capacity ?? '—'}</td>
                            <td>
                              <span className={`programme-status-pill ${prog.active ? 'is-active' : 'is-inactive'}`}>
                                <i />
                                {prog.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="programme-row-actions">
                                <button type="button" onClick={() => handleEdit(prog)} className="programme-edit-button">
                                  <Pencil size={14} /> Edit
                                </button>
                                <button type="button" onClick={() => handleDelete(prog)} className="programme-delete-button">
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : programmes.length > 0 ? (
                  <div className="programme-state">
                    <Search size={23} />
                    <p>No programmes match these filters.</p>
                    <button type="button" className="programme-secondary-button" onClick={() => {
                      setProgrammeSearch('')
                      setProgrammeTypeFilter('all')
                    }}>Clear filters</button>
                  </div>
                ) : (
                  <div className="programme-state">
                    <BookOpen size={24} />
                    <p>No programmes have been added yet.</p>
                    <button type="button" className="programme-secondary-button" onClick={() => setShowForm(true)}>Create a programme</button>
                  </div>
                )}
              </section>
            )}
          </>
        ) : activeMainTab === 'course_units' ? (
          <div className="course-units-admin">
            <section className="course-unit-form-panel">
              <div className="programme-section-heading">
                <div>
                  <p className="admin-programmes-eyebrow">Curriculum</p>
                  <h2>{cuEditId ? 'Edit course unit' : 'Add a course unit'}</h2>
                  <p>Attach a subject to a programme and set its study year, semester, and credit value.</p>
                </div>
              </div>

              {cuError && <div className="programme-feedback programme-feedback--error" role="alert">{cuError}</div>}
              {cuSuccess && <div className="programme-feedback programme-feedback--success" role="status"><CheckCircle size={16} /> {cuSuccess}</div>}

              <form onSubmit={handleCUSubmit} className="course-unit-form">
              <div className="course-unit-form-grid">
                <div className="course-unit-form-wide">
                  <label htmlFor="course-unit-programme">Programme *</label>
                  <select
                    id="course-unit-programme"
                    value={cuForm.programme_id}
                    onChange={e => setCuForm({ ...cuForm, programme_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select Programme --</option>
                    {programmes.filter((programme) => programme.active).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="course-unit-code">Course code *</label>
                  <input
                    id="course-unit-code"
                    type="text"
                    value={cuForm.course_code}
                    onChange={e => setCuForm({ ...cuForm, course_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CS101"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="course-unit-credits">Credits</label>
                  <input id="course-unit-credits" type="number" min="1" max="10" value={cuForm.credits} onChange={e => setCuForm({ ...cuForm, credits: +e.target.value })} />
                </div>
                <div className="course-unit-form-wide">
                  <label htmlFor="course-unit-name">Course name *</label>
                  <input
                    id="course-unit-name"
                    type="text"
                    value={cuForm.name}
                    onChange={e => setCuForm({ ...cuForm, name: e.target.value })}
                    placeholder="e.g. Introduction to Computer Science"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="course-unit-year">Year of study</label>
                  <select id="course-unit-year" value={cuForm.target_year} onChange={e => setCuForm({ ...cuForm, target_year: +e.target.value })}>
                    {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="course-unit-semester">Semester</label>
                  <select id="course-unit-semester" value={cuForm.target_semester} onChange={e => setCuForm({ ...cuForm, target_semester: +e.target.value })}>
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </div>
                
                <div className="course-unit-topics course-unit-form-wide">
                  <label htmlFor="course-unit-topic">Topics outline <span>(optional)</span></label>
                  <p>List the syllabus topics covered in this course unit. These will be visible to students and act as a guide for lecturers.</p>
                  
                  <div className="course-unit-topic-entry">
                    <input 
                      id="course-unit-topic"
                      type="text" 
                      value={newCuModule} 
                      onChange={(e) => setNewCuModule(e.target.value)} 
                      placeholder="e.g. Module 1: Introduction to Programming" 
                      onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddCuModule(); } }} 
                    />
                    <button type="button" onClick={handleAddCuModule} className="programme-secondary-button">Add topic</button>
                  </div>
                  
                  {cuModules.length > 0 && (
                    <ul className="course-unit-topic-list">
                      {cuModules.map((item, index) => (
                        <li key={index}>
                          <span>{index + 1}. {item}</span>
                          <button type="button" onClick={() => handleRemoveCuModule(index)} aria-label={`Remove topic ${index + 1}`}><X size={15} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="course-unit-form-actions">
                <button type="submit" className="programme-primary-button">{cuEditId ? 'Update unit' : 'Create unit'}</button>
                {cuEditId && <button type="button" className="programme-back-button" onClick={() => { setCuEditId(null); setCuForm({ programme_id: '', course_code: '', name: '', credits: 3, target_year: 1, target_semester: 1 }); setCuModules([]); }}>Cancel edit</button>}
              </div>
              </form>
            </section>

            <section className="course-unit-list-panel" aria-labelledby="course-unit-list-title">
              <div className="programme-section-heading course-unit-list-heading">
                <div>
                  <p className="admin-programmes-eyebrow">Curriculum</p>
                  <h2 id="course-unit-list-title">Course unit library <span>{filteredCourseUnits.length}</span></h2>
                  <p>Review and update units already assigned to programmes.</p>
                </div>
                <label className="programme-search course-unit-search">
                  <Search size={17} aria-hidden="true" />
                  <span className="programmes-sr-only">Search course units</span>
                  <input type="search" value={courseUnitSearch} onChange={(event) => setCourseUnitSearch(event.target.value)} placeholder="Search units or programmes" />
                  {courseUnitSearch && <button type="button" onClick={() => setCourseUnitSearch('')} aria-label="Clear search"><X size={15} /></button>}
                </label>
              </div>
              {cuLoading ? (
                <div className="programme-state" role="status"><span className="programme-spinner" /> Loading course units…</div>
              ) : cuLoadFailed ? (
                <div className="programme-state programme-state--error" role="alert">
                  <p>{cuLoadError?.response?.data?.message || 'Course units could not be loaded.'}</p>
                  <button type="button" className="programme-secondary-button" onClick={() => fetchCourseUnits()}>Try again</button>
                </div>
              ) : filteredCourseUnits.length > 0 ? (
                <div className="programmes-table course-units-table">
                  <table className="admin-programme-table">
                    <thead>
                      <tr>
                        <th scope="col">Code</th>
                        <th scope="col">Course unit</th>
                        <th scope="col">Programme</th>
                        <th scope="col">Year / term</th>
                        <th scope="col">Credits</th>
                        <th scope="col"><span className="programmes-sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourseUnits.map((unit) => (
                        <tr key={unit.id}>
                          <td><span className="course-unit-code">{unit.course_code}</span></td>
                          <td>
                            <strong>{unit.name}</strong>
                            {unit.modules?.length > 0 && <span className="course-unit-module-count">{unit.modules.length} topics</span>}
                          </td>
                          <td>{unit.programme_name}</td>
                          <td>Year {unit.target_year}, semester {unit.target_semester}</td>
                          <td>{unit.credits}</td>
                          <td>
                            <div className="programme-row-actions">
                              <button type="button" onClick={() => handleCUEdit(unit)} className="programme-edit-button"><Pencil size={14} /> Edit</button>
                              <button type="button" onClick={() => handleCUDelete(unit.id)} className="programme-delete-button"><Trash2 size={14} /> Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : courseUnits.length > 0 ? (
                <div className="programme-state"><Search size={23} /><p>No course units match your search.</p></div>
              ) : (
                <div className="programme-state">
                  <BookOpen size={24} />
                  <p>No course units yet. Add one using the form above.</p>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="categories-ui">
            <section className="homepage-cards-panel" aria-labelledby="homepage-cards-title">
              <div className="programme-section-heading">
                <div>
                  <p className="admin-programmes-eyebrow">Public homepage</p>
                  <h2 id="homepage-cards-title">Homepage card imagery</h2>
                  <p>Manage the images shown on the programme cards across the public homepage.</p>
                </div>
              </div>
            
            {loadingCategories ? (
              <div className="programme-state" role="status"><span className="programme-spinner" /> Loading homepage cards…</div>
            ) : categoriesLoadFailed ? (
              <div className="programme-state programme-state--error" role="alert">
                <p>{categoriesLoadError?.response?.data?.message || 'Homepage cards could not be loaded.'}</p>
                <button type="button" className="programme-secondary-button" onClick={() => fetchCategories()}>Try again</button>
              </div>
            ) : (
              <div className="homepage-card-grid">
                {categories.map(cat => (
                  <article key={cat.id} className="homepage-card">
                    <div className="homepage-card-image">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={`${cat.title} programme card`} />
                      ) : (
                        <div className="homepage-card-empty">
                          <Image size={24} />
                          <span>No image uploaded</span>
                        </div>
                      )}
                    </div>
                    <div className="homepage-card-content">
                      <h3>{cat.title}</h3>
                      <label className="programme-secondary-button homepage-card-upload">
                        <Upload size={15} />
                        {uploadingCategory === cat.id ? 'Uploading…' : cat.image_url ? 'Replace image' : 'Upload image'}
                        <input
                            type="file" 
                            accept="image/*" 
                            className="programme-file-input"
                            onChange={(e) => handleImageUpload(e, cat.id)}
                            disabled={uploadingCategory === cat.id}
                          />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
