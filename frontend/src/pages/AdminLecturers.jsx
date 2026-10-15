import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { CheckCircle, Users, AlertCircle } from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'
import './AdminProgrammes.css'

const API = import.meta.env.VITE_API_URL

export default function AdminLecturers() {
  const [view, setView] = useState('list') // 'list' | 'create' | 'assign'
  const [selectedLecturer, setSelectedLecturer] = useState(null)

  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [assignForm, setAssignForm] = useState({ course_id: '', academic_term_id: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const token = localStorage.getItem('adminToken')

  const { data: lecturersData, isLoading: loadingLecturers, refetch: fetchLecturers } = useApiQuery('/admin/lecturers', 'adminLecturers', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })
  
  const { data: termsData, isLoading: loadingTerms } = useApiQuery('/calendar/terms', 'adminTerms', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })
  
  const { data: coursesData, isLoading: loadingCourses } = useApiQuery('/course-units', 'adminCourseUnits', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: assignmentsData, refetch: fetchAssignments } = useApiQuery(
    selectedLecturer ? `/admin/lecturers/${selectedLecturer.id}/assignments` : '/admin/lecturers',
    'adminLecturerAssignments',
    {
      axiosOptions: { headers: { Authorization: `Bearer ${token}` } },
      queryOptions: { enabled: !!selectedLecturer }
    }
  )

  const lecturers = lecturersData?.data || []
  const terms = termsData?.data || []
  const courses = coursesData?.data || []
  const assignments = assignmentsData?.data || []

  const loading = loadingLecturers || loadingTerms || loadingCourses

  const handleCreate = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      await axios.post(`${API}/admin/lecturers`, form, { headers: { Authorization: `Bearer ${token}` } })
      setSuccess('Lecturer created successfully.')
      setForm({ first_name: '', last_name: '', email: '', password: '' })
      fetchLecturers()
      setView('list')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create lecturer.')
    }
  }

  const handleToggleActive = async (lecturer) => {
    try {
      await axios.put(`${API}/admin/lecturers/${lecturer.id}`, {
        ...lecturer,
        is_active: !lecturer.is_active
      }, { headers: { Authorization: `Bearer ${token}` } })
      fetchLecturers()
    } catch (err) {
      setError('Failed to update lecturer.')
    }
  }

  const openAssign = (lecturer) => {
    setSelectedLecturer(lecturer)
    setView('assign')
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      await axios.post(`${API}/admin/lecturers/assignments`, {
        lecturer_id: selectedLecturer.id,
        course_id: assignForm.course_id,
        academic_term_id: assignForm.academic_term_id
      }, { headers: { Authorization: `Bearer ${token}` } })
      setSuccess('Course assigned!')
      setAssignForm({ course_id: '', academic_term_id: '' })
      fetchAssignments()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign course.')
    }
  }

  const handleRemoveAssignment = async (assignmentId) => {
    if (!window.confirm('Remove this assignment?')) return
    try {
      await axios.delete(`${API}/admin/lecturers/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchAssignments()
    } catch (err) {
      setError('Failed to remove assignment.')
    }
  }

  return (
    <div className="scope-adminlecturers admin-layout">
      <AdminSidebar />
      <main className="admin-content" style={{ padding: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#1e1b4b' }}>
              {view === 'list' ? 'Lecturers' : view === 'create' ? 'Add New Lecturer' : `Assignments — ${selectedLecturer?.first_name} ${selectedLecturer?.last_name}`}
            </h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
              {view === 'list' ? 'Manage all teaching staff and course assignments.' : ''}
            </p>
          </div>
          {view === 'list' && (
            <button className="btn-primary" onClick={() => { setView('create'); setError(''); setSuccess('') }}>
              + Add Lecturer
            </button>
          )}
          {view !== 'list' && (
            <button className="btn-secondary" onClick={() => { setView('list'); setError(''); setSuccess('') }}>
              ← Back
            </button>
          )}
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '1rem', padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', color: '#991b1b' }}>{error}</div>}
        {success && <div style={{ marginBottom: '1rem', padding: '12px 16px', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '10px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} /> {success}</div>}

        {/* ── CREATE FORM ──────────────────────────────────────────────────── */}
        {view === 'create' && (
          <form onSubmit={handleCreate} style={{ background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', maxWidth: '560px' }}>
            <h3 style={{ marginTop: 0, color: '#1e1b4b' }}>Lecturer Details</h3>
            {['first_name', 'last_name', 'email', 'password'].map(field => (
              <div key={field} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  {field.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} *
                </label>
                <input
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  value={form[field]}
                  onChange={e => setForm({ ...form, [field]: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <button type="submit" className="btn-primary">Create Lecturer</button>
          </form>
        )}

        {/* ── ASSIGN FORM ──────────────────────────────────────────────────── */}
        {view === 'assign' && (
          <div>
            <form onSubmit={handleAssign} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
              <h3 style={{ marginTop: 0, color: '#1e1b4b' }}>Assign a Course to this Lecturer</h3>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '16px' }}>
                Select a course unit (subject) and the academic term to allocate teaching responsibilities.
              </p>

              {courses.length === 0 && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px 18px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontSize: '0.875rem' }}>
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>No course units found in the system. Course units must first be created under <strong>Programmes &rarr; Course Units</strong> before they can be assigned.</span>
                  </div>
                  <Link to="/admin/programmes" style={{ background: 'var(--color-primary, #0052cc)', color: '#ffffff', textDecoration: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Add Course Units
                  </Link>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Course Unit *</label>
                  <select
                    value={assignForm.course_id}
                    onChange={e => setAssignForm({ ...assignForm, course_id: e.target.value })}
                    required
                    disabled={courses.length === 0}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', background: courses.length === 0 ? '#f8fafc' : '#ffffff' }}
                  >
                    <option value="">{courses.length === 0 ? '-- No course units available --' : '-- Select Course Unit --'}</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} - {c.name}{c.programme_name ? ` (${c.programme_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Academic Term *</label>
                  <select
                    value={assignForm.academic_term_id}
                    onChange={e => setAssignForm({ ...assignForm, academic_term_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  >
                    <option value="">Select Term</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.academic_year_name} — {t.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn-primary">Assign</button>
              </div>
            </form>

            {/* Existing assignments */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h3 style={{ marginTop: 0, color: '#1e1b4b' }}>Current Assignments</h3>
              {assignments.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '24px' }}>No assignments yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      {['Course', 'Programme', 'Term', 'Action'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#374151' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px' }}><strong>{a.course_code}</strong> — {a.course_name}</td>
                        <td style={{ padding: '12px', color: '#6b7280' }}>{a.programme_name}</td>
                        <td style={{ padding: '12px', color: '#6b7280' }}>{a.year_name} / {a.term_name}</td>
                        <td style={{ padding: '12px' }}>
                          <button
                            onClick={() => handleRemoveAssignment(a.id)}
                            style={{ background: '#fee2e2', border: 'none', color: '#991b1b', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── LECTURERS LIST ────────────────────────────────────────────────── */}
        {view === 'list' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Loading...</div>
          ) : lecturers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px' }}>
              <Users size={48} style={{ color: '#9ca3af' }} />
              <p style={{ color: '#9ca3af', marginTop: '12px' }}>No lecturers found. Add one above.</p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8f8ff', borderBottom: '2px solid #e0e7ff' }}>
                    {['Name', 'Email', 'Assignments', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 700, color: '#1e1b4b', fontSize: '0.83rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lecturers.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                            {l.first_name[0]}{l.last_name[0]}
                          </div>
                          {l.first_name} {l.last_name}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280' }}>{l.email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                          {l.total_assignments} course{l.total_assignments !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: l.is_active ? '#d1fae5' : '#fee2e2', color: l.is_active ? '#065f46' : '#991b1b', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                          {l.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => openAssign(l)}
                            style={{ background: '#e0e7ff', border: 'none', color: '#3730a3', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                          >
                            Manage Courses
                          </button>
                          <button
                            onClick={() => handleToggleActive(l)}
                            style={{ background: l.is_active ? '#fee2e2' : '#d1fae5', border: 'none', color: l.is_active ? '#991b1b' : '#065f46', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                          >
                            {l.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>
    </div>
  )
}
