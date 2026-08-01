import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import LecturerSidebar from '../components/LecturerSidebar'
import './LecturerCourseDetails.css'

const API = import.meta.env.VITE_API_URL

const FILE_ICONS = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-powerpoint': '📊',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📊',
  'application/vnd.ms-excel': '📈',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📈',
  'video/mp4': '🎬',
  'video/mpeg': '🎬',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  default: '📎'
}

function getFileIcon(mimeType) {
  return FILE_ICONS[mimeType] || FILE_ICONS.default
}

export default function LecturerCourseDetails() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [materials, setMaterials] = useState([])
  const [students, setStudents] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [activeTab, setActiveTab] = useState('materials') // 'materials', 'gradebook', 'announcements'
  const [ssoLoading, setSsoLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingGrades, setSavingGrades] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  
  // Forms
  const [form, setForm] = useState({ title: '', description: '' })
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '' })
  const [file, setFile] = useState(null)
  const fileInputRef = useRef(null)

  const token = localStorage.getItem('lecturerToken')

  useEffect(() => {
    fetchCourseData()
  }, [courseId])

  const fetchCourseData = async () => {
    setLoading(true)
    try {
      const [courseRes, studentsRes, announcementsRes] = await Promise.all([
        axios.get(`${API}/lecturer/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/lecturer/courses/${courseId}/students`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/lecturer/courses/${courseId}/announcements`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      
      setData(courseRes.data.data)
      setMaterials(courseRes.data.data.materials)
      setStudents(studentsRes.data.data)
      setAnnouncements(announcementsRes.data.data)
    } catch (err) {
      setError('Failed to load course details')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return setUploadError('Please select a file.')
    setUploading(true)
    setUploadError('')
    setUploadSuccess('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', form.title)
    formData.append('description', form.description)

    try {
      await axios.post(`${API}/lecturer/courses/${courseId}/materials`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      setUploadSuccess('Material uploaded successfully!')
      setForm({ title: '', description: '' })
      setFile(null)
      setShowUploadForm(false)
      fetchCourseData()
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleCreateOnlineExam = async () => {
    setSsoLoading(true)
    try {
      const res = await axios.get(`${API}/lecturer/courses/${courseId}/exam-sso`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success && res.data.ssoUrl) {
        window.open(res.data.ssoUrl, '_blank')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate SSO token')
    } finally {
      setSsoLoading(false)
    }
  }

  const handleDelete = async (materialId) => {
    if (!window.confirm('Delete this material?')) return
    try {
      await axios.delete(`${API}/lecturer/materials/${materialId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchCourseData()
    } catch (err) {
      alert('Failed to delete material.')
    }
  }

  const handleGradeChange = (studentIndex, field, value) => {
    const updated = [...students]
    updated[studentIndex][field] = value
    setStudents(updated)
  }

  const saveGrades = async () => {
    setSavingGrades(true)
    setSuccessMsg('')
    setError('')
    try {
      const payload = students.map(s => ({
        course_registration_id: s.course_registration_id,
        coursework_mark: s.coursework_mark,
        exam_mark: s.exam_mark
      }))
      await axios.post(`${API}/lecturer/courses/${courseId}/grades`, { grades: payload }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuccessMsg('Grades saved successfully.')
      fetchCourseData()
    } catch (err) {
      setError('Failed to save grades.')
    } finally {
      setSavingGrades(false)
    }
  }

  const handlePostAnnouncement = async (e) => {
    e.preventDefault()
    setUploadError('')
    setUploadSuccess('')
    try {
      await axios.post(`${API}/lecturer/courses/${courseId}/announcements`, announcementForm, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUploadSuccess('Announcement posted!')
      setAnnouncementForm({ title: '', body: '' })
      setShowUploadForm(false)
      fetchCourseData()
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to post announcement.')
    }
  }

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return
    try {
      await axios.delete(`${API}/lecturer/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchCourseData()
    } catch (err) {
      alert('Failed to delete announcement.')
    }
  }

  if (loading) return (
    <div className="lecturer-layout">
      <div className="lecturer-loading" style={{ margin: 'auto' }}>
        <div className="spinner-ring"></div>
        <p>Loading course...</p>
      </div>
    </div>
  )

  const { course, term, enrolled_students } = data || {}

  return (
    <div className="lecturer-layout">
      <LecturerSidebar />

      <main className="lecturer-main">
        <div className="course-detail-header">
          <div className="course-header-badge">{course?.course_code}</div>
          <h1>{course?.name}</h1>
          <p className="course-header-meta">{course?.programme_name} · Year {course?.target_year} · Semester {course?.target_semester}</p>
          {term && <span className="term-badge">📅 {term.name}</span>}
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{enrolled_students}</div>
            <div className="stat-label">Enrolled Students</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{materials?.length}</div>
            <div className="stat-label">Materials Uploaded</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{course?.credits}</div>
            <div className="stat-label">Credit Units</div>
          </div>
        </div>

        <div className="tabs" style={{ display: 'flex', gap: '20px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb' }}>
          <button 
            className={`tab ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'materials' ? '2px solid #6366f1' : 'none', color: activeTab === 'materials' ? '#6366f1' : '#64748b', fontWeight: activeTab === 'materials' ? '600' : '500', cursor: 'pointer', marginBottom: '-2px' }}
          >
            Materials
          </button>
          <button 
            className={`tab ${activeTab === 'gradebook' ? 'active' : ''}`}
            onClick={() => setActiveTab('gradebook')}
            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'gradebook' ? '2px solid #6366f1' : 'none', color: activeTab === 'gradebook' ? '#6366f1' : '#64748b', fontWeight: activeTab === 'gradebook' ? '600' : '500', cursor: 'pointer', marginBottom: '-2px' }}
          >
            Gradebook
          </button>
          <button 
            className={`tab ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}
            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'announcements' ? '2px solid #6366f1' : 'none', color: activeTab === 'announcements' ? '#6366f1' : '#64748b', fontWeight: activeTab === 'announcements' ? '600' : '500', cursor: 'pointer', marginBottom: '-2px' }}
          >
            Announcements
          </button>
        </div>

        {activeTab === 'materials' && (
          <div className="tab-content">
            <div className="materials-header">
              <h2>Course Materials</h2>
              <button className="btn-upload-toggle" onClick={() => setShowUploadForm(!showUploadForm)}>
                {showUploadForm ? '✕ Cancel' : '＋ Upload Material'}
              </button>
            </div>

            {course?.modules && course.modules.length > 0 && (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1e293b' }}>Official Syllabus (Topics)</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b' }}>These are the modules assigned to this course unit by the administrator.</p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', fontSize: '0.9rem' }}>
                  {course.modules.map((mod, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>{mod}</li>
                  ))}
                </ul>
              </div>
            )}

            {uploadSuccess && <div className="alert-success">✅ {uploadSuccess}</div>}

            {showUploadForm && (
              <form className="upload-form" onSubmit={handleUpload}>
                <h3>📤 Upload New Material</h3>
                {uploadError && <div className="alert-error">⚠️ {uploadError}</div>}
                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="file-drop-zone" onClick={() => fileInputRef.current?.click()}>
                  <p>{file ? file.name : 'Click to select a file'}</p>
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                </div>
                <button type="submit" className="btn-upload" disabled={uploading}>Upload</button>
              </form>
            )}

            <div className="materials-list">
              {materials.map(mat => (
                <div key={mat.id} className="material-item">
                  <div className="material-icon">{getFileIcon(mat.file_type)}</div>
                  <div className="material-info">
                    <div className="material-title">{mat.title}</div>
                    <a href={mat.drive_file_url} target="_blank" rel="noopener noreferrer">View File</a>
                  </div>
                  <button className="btn-delete" onClick={() => handleDelete(mat.id)}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'gradebook' && (
          <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Student Gradebook</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleCreateOnlineExam}
                  disabled={ssoLoading}
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: ssoLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600
                  }}
                >
                  {ssoLoading ? 'Connecting...' : '✨ Create Online Exam (SEB)'}
                </button>
                <button 
                  onClick={saveGrades} 
                  disabled={savingGrades}
                  style={{ background: '#22c55e', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: savingGrades ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                >
                  {savingGrades ? 'Saving...' : 'Save Grades'}
                </button>
              </div>
            </div>
            
            {successMsg && <div className="alert-success" style={{ marginBottom: '16px' }}>{successMsg}</div>}
            {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

            {students.length === 0 ? (
              <p style={{ color: '#64748b' }}>No active students enrolled in this course.</p>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Student No.</th>
                      <th>Name</th>
                      <th>Coursework (40)</th>
                      <th>Exam (60)</th>
                      <th>Final Score</th>
                      <th>Grade</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      const isOnline = student.source === 'online_exam_portal'
                      return (
                        <tr key={student.course_registration_id}>
                          <td>{student.student_number}</td>
                          <td>{student.student_name}</td>
                          <td>
                            <input 
                              type="number" 
                              max="40" min="0" 
                              value={student.coursework_mark ?? ''}
                              onChange={e => handleGradeChange(index, 'coursework_mark', e.target.value)}
                              disabled={isOnline}
                              style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: isOnline ? '#f1f5f9' : 'white' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              max="60" min="0" 
                              value={student.exam_mark ?? ''}
                              onChange={e => handleGradeChange(index, 'exam_mark', e.target.value)}
                              disabled={isOnline}
                              style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: isOnline ? '#f1f5f9' : 'white' }}
                            />
                          </td>
                          <td><strong>{student.final_score ?? '-'}</strong></td>
                          <td><strong>{student.grade_letter ?? '-'}</strong></td>
                          <td>
                            {isOnline ? (
                              <span style={{ fontSize: '0.8rem', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px' }}>SEB Portal 🔒</span>
                            ) : (
                              <span style={{ fontSize: '0.8rem', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>Offline</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="tab-content">
            <div className="materials-header">
              <h2>Course Announcements</h2>
              <button className="btn-upload-toggle" onClick={() => { setShowUploadForm(!showUploadForm); setUploadError(''); setUploadSuccess('') }}>
                {showUploadForm ? '✕ Cancel' : '＋ New Announcement'}
              </button>
            </div>

            {uploadSuccess && <div className="alert-success">✅ {uploadSuccess}</div>}

            {showUploadForm && (
              <form className="upload-form" onSubmit={handlePostAnnouncement}>
                <h3>📢 Post an Announcement</h3>
                {uploadError && <div className="alert-error">⚠️ {uploadError}</div>}
                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Message *</label>
                  <textarea value={announcementForm.body} onChange={e => setAnnouncementForm({ ...announcementForm, body: e.target.value })} required style={{ width: '100%', minHeight: '100px', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}></textarea>
                </div>
                <button type="submit" className="btn-upload">Post Announcement</button>
              </form>
            )}

            <div className="materials-list">
              {announcements.length === 0 ? (
                <p style={{ color: '#64748b' }}>No announcements posted yet.</p>
              ) : announcements.map(ann => (
                <div key={ann.id} className="material-item" style={{ display: 'block', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>{ann.title}</h4>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {new Date(ann.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 16px 0', color: '#334155', whiteSpace: 'pre-wrap' }}>{ann.body}</p>
                  <button className="btn-delete" onClick={() => handleDeleteAnnouncement(ann.id)}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
