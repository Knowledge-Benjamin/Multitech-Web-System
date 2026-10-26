import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import {
  GraduationCap,
  Calendar,
  Users,
  FileText,
  Layers,
  Plus,
  X,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Trash2,
  ExternalLink,
  Save,
  Megaphone,
  ArrowLeft,
  FileSpreadsheet,
  Presentation,
  Video,
  Image as ImageIcon,
  File,
  Lock,
  Unlock,
  BookOpen,
  ShieldCheck,
  Laptop,
  Paperclip
} from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import LecturerSidebar from '../components/LecturerSidebar'
import './AdminDashboard.css'
import './LecturerDashboard.css'
import './LecturerCourseDetails.css'

const API = import.meta.env.VITE_API_URL

function renderFileIcon(mimeType) {
  if (!mimeType) return <File size={20} />
  if (mimeType.includes('pdf')) return <FileText size={20} style={{ color: '#ef4444' }} />
  if (mimeType.includes('word') || mimeType.includes('officedocument.wordprocessingml')) return <FileText size={20} style={{ color: '#2563eb' }} />
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation size={20} style={{ color: '#f59e0b' }} />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet size={20} style={{ color: '#10b981' }} />
  if (mimeType.includes('video')) return <Video size={20} style={{ color: '#8b5cf6' }} />
  if (mimeType.includes('image')) return <ImageIcon size={20} style={{ color: '#06b6d4' }} />
  return <File size={20} style={{ color: '#64748b' }} />
}

export default function LecturerCourseDetails() {
  const { courseId } = useParams()
  const [students, setStudents] = useState([])
  const [activeTab, setActiveTab] = useState('materials') // 'materials', 'gradebook', 'announcements'
  const [ssoLoading, setSsoLoading] = useState(false)
  const [savingGrades, setSavingGrades] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [unlockedGrades, setUnlockedGrades] = useState({})
  
  // Forms
  const [form, setForm] = useState({ title: '', description: '' })
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '' })
  const [file, setFile] = useState(null)
  const fileInputRef = useRef(null)

  const token = localStorage.getItem('lecturerToken')

  const { data: courseRes, isLoading, refetch: refetchCourse } = useApiQuery(
    `/lecturer/courses/${courseId}`,
    ['courseDetails', courseId],
    { axiosOptions: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: studentsRes, refetch: refetchStudents } = useApiQuery(
    `/lecturer/courses/${courseId}/students`,
    ['courseStudents', courseId],
    { axiosOptions: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: announcementsRes, refetch: refetchAnnouncements } = useApiQuery(
    `/lecturer/courses/${courseId}/announcements`,
    ['courseAnnouncements', courseId],
    { axiosOptions: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const data = courseRes?.data || null
  const materials = courseRes?.data?.materials || []
  const announcements = announcementsRes?.data || []
  const onlineExams = courseRes?.data?.online_exams || []

  useEffect(() => {
    if (studentsRes?.data) {
      setStudents(studentsRes.data)
    }
  }, [studentsRes])

  const fetchCourseData = () => {
    refetchCourse()
    refetchStudents()
    refetchAnnouncements()
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return setUploadError('Please select a file to upload.')
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
      setUploadSuccess('Course material published successfully.')
      setForm({ title: '', description: '' })
      setFile(null)
      setShowUploadForm(false)
      fetchCourseData()
    } catch (err) {
      setUploadError(err.response?.data?.message || 'File upload failed. Please try again.')
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
      alert(err.response?.data?.message || 'Failed to generate online exam session token.')
    } finally {
      setSsoLoading(false)
    }
  }

  const handleDelete = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this course material?')) return
    try {
      await axios.delete(`${API}/lecturer/materials/${materialId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchCourseData()
    } catch (err) {
      alert('Failed to delete course material.')
    }
  }

  const toggleUnlock = (regId) => {
    setUnlockedGrades(prev => ({
      ...prev,
      [regId]: !prev[regId]
    }))
  }

  const handleGradeChange = (studentIndex, field, value) => {
    const updated = [...students]
    updated[studentIndex][field] = value

    // Auto-calculate real-time preview of final score & letter grade
    const cw = Number(field === 'coursework_mark' ? value : updated[studentIndex].coursework_mark) || 0
    const ex = Number(field === 'exam_mark' ? value : updated[studentIndex].exam_mark) || 0
    const finalScore = Math.round((cw + ex) * 100) / 100
    updated[studentIndex].final_score = finalScore

    let letter = 'F'
    if (finalScore >= 80) letter = 'A'
    else if (finalScore >= 70) letter = 'B+'
    else if (finalScore >= 60) letter = 'B'
    else if (finalScore >= 50) letter = 'C'
    else if (finalScore >= 40) letter = 'D'
    updated[studentIndex].grade_letter = letter

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
      setSuccessMsg('Student grades saved and published.')
      fetchCourseData()
    } catch (err) {
      setError('Failed to update student grades.')
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
      setUploadSuccess('Class announcement broadcasted.')
      setAnnouncementForm({ title: '', body: '' })
      setShowUploadForm(false)
      fetchCourseData()
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to post announcement.')
    }
  }

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement notice?')) return
    try {
      await axios.delete(`${API}/lecturer/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchCourseData()
    } catch (err) {
      alert('Failed to delete announcement.')
    }
  }

  if (isLoading) {
    return (
      <div className="scope-lecturercoursedetails scope-admindashboard admin-layout">
        <LecturerSidebar />
        <main className="admin-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading course information...</p>
          </div>
        </main>
      </div>
    )
  }

  const { course, term, enrolled_students } = data || {}

  return (
    <div className="scope-lecturercoursedetails scope-admindashboard admin-layout">
      <LecturerSidebar />

      <main className="admin-content">
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            to="/lecturer/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--color-primary, #0052cc)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            <ArrowLeft size={16} /> Back to Courses
          </Link>
        </div>

        {/* Hero Header */}
        <header className="dashboard-hero fade-in-item" style={{ padding: '2.25rem 2.5rem' }}>
          <div className="hero-content">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.8rem',
                letterSpacing: '0.04em'
              }}>
                {course?.course_code}
              </span>
              {term && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.9)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem'
                }}>
                  <Calendar size={13} /> {term.name}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '1.85rem', marginBottom: '0.5rem' }}>{course?.name}</h1>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: '0.9rem' }}>
              <GraduationCap size={16} />
              <span>{course?.programme_name} &bull; Year {course?.target_year} &bull; Semester {course?.target_semester}</span>
            </p>
          </div>
          <div className="hero-decoration"></div>
        </header>

        {/* Stats Grid */}
        <div className="stats-grid fade-in-section is-visible" style={{ marginBottom: '2rem' }}>
          <div className="stat-card fade-in-item">
            <div className="stat-icon-wrapper bg-blue">
              <Users size={24} className="text-blue" />
            </div>
            <div className="stat-content">
              <h3>Enrolled Students</h3>
              <div className="stat-value-row">
                <p className="stat-number">{enrolled_students || 0}</p>
                <span className="trend positive">Registered</span>
              </div>
            </div>
          </div>

          <div className="stat-card fade-in-item">
            <div className="stat-icon-wrapper bg-indigo">
              <FileText size={24} className="text-indigo" />
            </div>
            <div className="stat-content">
              <h3>Materials</h3>
              <div className="stat-value-row">
                <p className="stat-number">{materials?.length || 0}</p>
                <span className="trend neutral">Uploaded</span>
              </div>
            </div>
          </div>

          <div className="stat-card fade-in-item">
            <div className="stat-icon-wrapper bg-amber">
              <Layers size={24} className="text-amber" />
            </div>
            <div className="stat-content">
              <h3>Credit Units</h3>
              <div className="stat-value-row">
                <p className="stat-number">{course?.credits || 0}</p>
                <span className="trend neutral">Academic Load</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.75rem',
          paddingBottom: '2px'
        }}>
          <button
            onClick={() => setActiveTab('materials')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'materials' ? '3px solid var(--color-primary, #0052cc)' : '3px solid transparent',
              color: activeTab === 'materials' ? 'var(--color-primary, #0052cc)' : '#64748b',
              fontWeight: activeTab === 'materials' ? 700 : 500,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={17} /> Materials ({materials.length})
          </button>

          <button
            onClick={() => setActiveTab('gradebook')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'gradebook' ? '3px solid var(--color-primary, #0052cc)' : '3px solid transparent',
              color: activeTab === 'gradebook' ? 'var(--color-primary, #0052cc)' : '#64748b',
              fontWeight: activeTab === 'gradebook' ? 700 : 500,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.15s ease'
            }}
          >
            <BookOpen size={17} /> Gradebook ({students.length})
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'announcements' ? '3px solid var(--color-primary, #0052cc)' : '3px solid transparent',
              color: activeTab === 'announcements' ? 'var(--color-primary, #0052cc)' : '#64748b',
              fontWeight: activeTab === 'announcements' ? 700 : 500,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.15s ease'
            }}
          >
            <Megaphone size={17} /> Announcements ({announcements.length})
          </button>

          <button
            onClick={() => setActiveTab('exams')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'exams' ? '3px solid #4f46e5' : '3px solid transparent',
              color: activeTab === 'exams' ? '#4f46e5' : '#64748b',
              fontWeight: activeTab === 'exams' ? 700 : 500,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldCheck size={17} /> Online Exams ({onlineExams.length})
          </button>
        </div>

        {/* Tab 1: Course Materials */}
        {activeTab === 'materials' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Course Study Materials</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Distribute lecture notes, slide decks, readings, and reference papers to enrolled students.
                </p>
              </div>
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: showUploadForm ? '#e2e8f0' : 'var(--color-primary, #0052cc)',
                  color: showUploadForm ? '#1e293b' : '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {showUploadForm ? <X size={16} /> : <Plus size={16} />}
                {showUploadForm ? 'Cancel' : 'Upload Material'}
              </button>
            </div>

            {/* Official Syllabus topics if present */}
            {course?.modules && course.modules.length > 0 && (
              <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#1e293b', fontWeight: 600 }}>
                  Curriculum Modules
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.88rem' }}>
                  {course.modules.map((mod, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{mod}</li>
                  ))}
                </ul>
              </div>
            )}

            {uploadSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', color: '#047857', padding: '12px 16px', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #a7f3d0', fontSize: '0.9rem' }}>
                <CheckCircle size={18} />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {showUploadForm && (
              <form
                onSubmit={handleUpload}
                style={{
                  background: '#ffffff',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  marginBottom: '1.75rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                }}
              >
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UploadCloud size={20} style={{ color: 'var(--color-primary, #0052cc)' }} />
                  Upload Course Material
                </h3>

                {uploadError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fecaca', fontSize: '0.88rem' }}>
                    <AlertCircle size={16} />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Material Title *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Lecture 3: Network Topology and Protocols"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Description / Reading Guide
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief notes on required reading sections"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '10px',
                    padding: '1.75rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#f8fafc',
                    marginBottom: '1.25rem'
                  }}
                >
                  <UploadCloud size={32} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', color: file ? 'var(--color-primary, #0052cc)' : '#64748b', fontWeight: file ? 600 : 400 }}>
                    {file ? file.name : 'Click to select document, slide, or PDF file'}
                  </p>
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--color-primary, #0052cc)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: uploading ? 'wait' : 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  {uploading ? 'Uploading to Repository...' : 'Publish Material'}
                </button>
              </form>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              {materials.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <FileText size={40} style={{ color: '#94a3b8', marginBottom: '0.75rem' }} />
                  <p style={{ margin: 0, color: '#64748b' }}>No course materials uploaded yet. Click "Upload Material" to share files with students.</p>
                </div>
              ) : (
                materials.map(mat => (
                  <div
                    key={mat.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '10px',
                      padding: '14px 18px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {renderFileIcon(mat.file_type)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{mat.title}</div>
                        {mat.description && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{mat.description}</div>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <a
                        href={mat.drive_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--color-primary, #0052cc)',
                          textDecoration: 'none',
                          fontWeight: 600,
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'rgba(0, 82, 204, 0.08)'
                        }}
                      >
                        View File
                      </a>
                      <button
                        onClick={() => handleDelete(mat.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        aria-label="Delete material"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Tab 2: Gradebook */}
        {activeTab === 'gradebook' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Student Gradebook</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Record coursework and exam marks for enrolled students. Final scores compute automatically.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCreateOnlineExam}
                  disabled={ssoLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: ssoLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  <ExternalLink size={15} />
                  {ssoLoading ? 'Connecting...' : 'Create Online Exam (SEB)'}
                </button>

                <button
                  onClick={saveGrades}
                  disabled={savingGrades}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#16a34a',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: savingGrades ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  <Save size={15} />
                  {savingGrades ? 'Saving...' : 'Save Grades'}
                </button>
              </div>
            </div>

            {successMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', color: '#047857', padding: '12px 16px', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #a7f3d0', fontSize: '0.9rem' }}>
                <CheckCircle size={18} />
                <span>{successMsg}</span>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #fecaca', fontSize: '0.9rem' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {students.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <Users size={40} style={{ color: '#94a3b8', marginBottom: '0.75rem' }} />
                <p style={{ margin: 0, color: '#64748b' }}>No students enrolled in this course unit for the selected term.</p>
              </div>
            ) : (
              <div className="table-container" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Student No.</th>
                      <th>Student Name</th>
                      <th>Coursework (40)</th>
                      <th>Exam (60)</th>
                      <th>Final Score</th>
                      <th>Grade</th>
                      <th>Assessment Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      const isOnline = student.source === 'online_exam_portal'
                      const isExamLocked = isOnline && !unlockedGrades[student.course_registration_id]
                      return (
                        <tr key={student.course_registration_id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{student.student_number}</td>
                          <td style={{ fontWeight: 600 }}>{student.student_name}</td>
                          <td>
                            <input
                              type="number"
                              max="40"
                              min="0"
                              value={student.coursework_mark ?? ''}
                              onChange={e => handleGradeChange(index, 'coursework_mark', e.target.value)}
                              placeholder="0"
                              style={{
                                width: '75px',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                textAlign: 'center',
                                fontWeight: 600
                              }}
                            />
                          </td>
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                max="60"
                                min="0"
                                value={student.exam_mark ?? ''}
                                onChange={e => handleGradeChange(index, 'exam_mark', e.target.value)}
                                disabled={isExamLocked}
                                placeholder="0"
                                style={{
                                  width: '75px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: isExamLocked ? '1px solid #c7d2fe' : '1px solid #cbd5e1',
                                  background: isExamLocked ? '#f8fafc' : '#ffffff',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                  color: isExamLocked ? '#4338ca' : 'inherit'
                                }}
                              />
                              {isOnline && (
                                <button
                                  type="button"
                                  onClick={() => toggleUnlock(student.course_registration_id)}
                                  title={isExamLocked ? "Score pushed from Safe Exam Browser. Click to unlock for manual moderation." : "Score unlocked. Click to re-lock."}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    color: isExamLocked ? '#4f46e5' : '#16a34a',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  {isExamLocked ? <Lock size={14} /> : <Unlock size={14} />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--color-primary, #0052cc)' }}>
                            {student.final_score ?? '-'}
                          </td>
                          <td>
                            <span style={{
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#f1f5f9',
                              color: '#1e293b'
                            }}>
                              {student.grade_letter ?? '-'}
                            </span>
                          </td>
                          <td>
                            {isOnline ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                background: '#e0e7ff',
                                color: '#4338ca',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontWeight: 600
                              }}>
                                <ShieldCheck size={12} /> SEB Synced
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.75rem',
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '3px 8px',
                                borderRadius: '4px'
                              }}>
                                Offline Entry
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tab 3: Announcements */}
        {activeTab === 'announcements' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Course Announcements</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Post timely class notifications, assignment deadlines, and room changes directly to students.
                </p>
              </div>
              <button
                onClick={() => { setShowUploadForm(!showUploadForm); setUploadError(''); setUploadSuccess('') }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: showUploadForm ? '#e2e8f0' : 'var(--color-primary, #0052cc)',
                  color: showUploadForm ? '#1e293b' : '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {showUploadForm ? <X size={16} /> : <Plus size={16} />}
                {showUploadForm ? 'Cancel' : 'New Announcement'}
              </button>
            </div>

            {uploadSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', color: '#047857', padding: '12px 16px', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #a7f3d0', fontSize: '0.9rem' }}>
                <CheckCircle size={18} />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {showUploadForm && (
              <form
                onSubmit={handlePostAnnouncement}
                style={{
                  background: '#ffffff',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  marginBottom: '1.75rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                }}
              >
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Megaphone size={20} style={{ color: 'var(--color-primary, #0052cc)' }} />
                  Publish Class Notice
                </h3>

                {uploadError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fecaca', fontSize: '0.88rem' }}>
                    <AlertCircle size={16} />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Subject / Title *
                  </label>
                  <input
                    type="text"
                    value={announcementForm.title}
                    onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                    placeholder="e.g. Midterm Assessment Date and Coverage"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Notice Content *
                  </label>
                  <textarea
                    value={announcementForm.body}
                    onChange={e => setAnnouncementForm({ ...announcementForm, body: e.target.value })}
                    required
                    rows={4}
                    placeholder="Detailed message for students..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--color-primary, #0052cc)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Post Announcement
                </button>
              </form>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              {announcements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <Megaphone size={40} style={{ color: '#94a3b8', marginBottom: '0.75rem' }} />
                  <p style={{ margin: 0, color: '#64748b' }}>No announcements published for this course yet.</p>
                </div>
              ) : (
                announcements.map(ann => (
                  <div
                    key={ann.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', fontWeight: 600 }}>{ann.title}</h4>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {new Date(ann.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 1rem', color: '#475569', fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {ann.body}
                    </p>

                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Tab 4: Online Exams */}
        {activeTab === 'exams' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Online Safe Exam Browser Assessments</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Manage and monitor secure Safe Exam Browser (SEB) exams created for this course.
                </p>
              </div>

              <button
                onClick={handleCreateOnlineExam}
                disabled={ssoLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  cursor: ssoLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.88rem'
                }}
              >
                <ExternalLink size={16} />
                {ssoLoading ? 'Opening Portal...' : 'Create New Online Exam (SEB)'}
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <ShieldCheck size={20} style={{ color: '#4f46e5', flexShrink: 0 }} />
              <div>
                <strong>Integrated Grading Workflow:</strong> After students complete exams via Safe Exam Browser, click <em>Review &amp; Grade in Portal</em> below. Once marked, grades automatically calculate and sync directly into your <strong>Gradebook</strong> tab.
              </div>
            </div>

            {onlineExams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 2rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <ShieldCheck size={48} style={{ color: '#818cf8', margin: '0 auto 1rem', display: 'block' }} />
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#1e293b' }}>No Online Exams Created Yet</h3>
                <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', maxWidth: '480px', marginInline: 'auto', fontSize: '0.9rem' }}>
                  Click below to open the Safe Exam Browser portal and set up a proctored assessment for {course?.name || 'this course'}.
                </p>
                <button
                  onClick={handleCreateOnlineExam}
                  disabled={ssoLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    cursor: ssoLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}
                >
                  <ExternalLink size={16} />
                  {ssoLoading ? 'Opening Portal...' : 'Create Exam in Portal'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                {onlineExams.map(ex => {
                  const now = new Date()
                  const start = new Date(ex.start_time)
                  const end = new Date(ex.end_time)
                  const isActive = now >= start && now <= end
                  const isUpcoming = now < start
                  const isCw = ex.assessment_type === 'coursework'

                  return (
                    <div
                      key={ex.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        padding: '18px 22px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}
                    >
                      <div style={{ display: 'grid', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>{ex.exam_title}</h3>
                          <span style={{
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: isActive ? '#dcfce7' : isUpcoming ? '#e0e7ff' : '#f1f5f9',
                            color: isActive ? '#15803d' : isUpcoming ? '#4338ca' : '#64748b'
                          }}>
                            {isActive ? 'Active Now' : isUpcoming ? 'Upcoming' : 'Ended'}
                          </span>
                          <span style={{
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            background: isCw ? '#fdf4ff' : '#eef2ff',
                            color: isCw ? '#9333ea' : '#4338ca',
                            border: isCw ? '1px solid #f0abfc' : '1px solid #c7d2fe'
                          }}>
                            {isCw ? '📝 Coursework / CAT' : '🎓 Final Examination'} ({Number(ex.weight_percentage) || (isCw ? 40 : 60)}%)
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                          <span><strong>Schedule:</strong> {new Date(ex.start_time).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          <span><strong>Duration:</strong> {ex.duration_minutes} mins</span>
                        </div>

                        {/* Badges for SEB settings */}
                        {(() => {
                          const apps = Array.isArray(ex.permitted_apps)
                            ? ex.permitted_apps
                            : typeof ex.permitted_apps === 'string'
                              ? (() => { try { return JSON.parse(ex.permitted_apps) } catch { return [] } })()
                              : []
                          return (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                              {apps.length > 0 && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  color: '#166534',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}>
                                  <Laptop size={12} /> {apps.map(a => a.title || a.executable).join(', ')}
                                </span>
                              )}
                              {ex.allow_file_upload && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#1e40af',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}>
                                  <Paperclip size={12} /> File Uploads Enabled
                                </span>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={handleCreateOnlineExam}
                          disabled={ssoLoading}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#4f46e5',
                            color: '#ffffff',
                            border: 'none',
                            padding: '9px 16px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: ssoLoading ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <ExternalLink size={14} /> Review &amp; Grade in Portal
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
