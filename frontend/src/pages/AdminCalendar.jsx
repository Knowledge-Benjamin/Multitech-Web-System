import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'

export default function AdminCalendar() {
  const [activeTab, setActiveTab] = useState('years')
  const [years, setYears] = useState([])
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)

  const [showYearModal, setShowYearModal] = useState(false)
  const [showTermModal, setShowTermModal] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [yearData, setYearData] = useState({ name: '', start_date: '', end_date: '', status: 'upcoming' })
  const [termData, setTermData] = useState({ academic_year_id: '', name: '', start_date: '', end_date: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const token = localStorage.getItem('adminToken')
    try {
      const [yearRes, termRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/calendar/years`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${import.meta.env.VITE_API_URL}/calendar/terms`, { headers: { Authorization: `Bearer ${token}` } })
      ])
      
      setYears(yearRes.data.data || [])
      setTerms(termRes.data.data || [])
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generic handler for form inputs
  const handleYearChange = (e) => setYearData({ ...yearData, [e.target.name]: e.target.value })
  const handleTermChange = (e) => setTermData({ ...termData, [e.target.name]: e.target.value })

  // -----------------------------------------
  // Academic Years
  // -----------------------------------------
  const submitYear = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/calendar/years/${editingId}`, yearData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/calendar/years`, yearData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      setShowYearModal(false)
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving year')
    }
  }

  const deleteYear = async (id) => {
    if (!confirm('Delete this Academic Year? This cannot be undone.')) return
    const token = localStorage.getItem('adminToken')
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/calendar/years/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting year')
    }
  }

  // -----------------------------------------
  // Academic Terms
  // -----------------------------------------
  const submitTerm = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/calendar/terms/${editingId}`, termData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/calendar/terms`, termData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      setShowTermModal(false)
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving term')
    }
  }

  const deleteTerm = async (id) => {
    if (!confirm('Delete this Academic Term?')) return
    const token = localStorage.getItem('adminToken')
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/calendar/terms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting term')
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <span className="badge badge-success">Active</span>
      case 'upcoming': return <span className="badge badge-primary">Upcoming</span>
      case 'completed': return <span className="badge badge-neutral">Completed</span>
      default: return <span className="badge">{status}</span>
    }
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Academic Calendar</h1>
          {activeTab === 'years' ? (
            <button className="button button-primary" onClick={() => {
              setYearData({ name: '', start_date: '', end_date: '', status: 'upcoming' })
              setEditingId(null)
              setShowYearModal(true)
            }}>+ Add Academic Year</button>
          ) : (
            <button className="button button-primary" onClick={() => {
              setTermData({ academic_year_id: '', name: '', start_date: '', end_date: '' })
              setEditingId(null)
              setShowTermModal(true)
            }}>+ Add Academic Term</button>
          )}
        </header>

        <div className="settings-tabs" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border)' }}>
          <button
            onClick={() => setActiveTab('years')}
            style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'years' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'years' ? 'var(--color-primary)' : 'var(--color-text)', cursor: 'pointer', fontWeight: activeTab === 'years' ? '600' : '400' }}
          >
            Academic Years
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'terms' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'terms' ? 'var(--color-primary)' : 'var(--color-text)', cursor: 'pointer', fontWeight: activeTab === 'terms' ? '600' : '400' }}
          >
            Semesters / Terms
          </button>
        </div>

        {loading ? <p>Loading calendar...</p> : activeTab === 'years' ? (
          <div className="table-container">
            <p className="text-muted mb-4">Define the overarching academic cycles (e.g., 2026/2027).</p>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Year Name</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {years.map(y => (
                  <tr key={y.id}>
                    <td><strong>{y.name}</strong></td>
                    <td>{new Date(y.start_date).toLocaleDateString()}</td>
                    <td>{new Date(y.end_date).toLocaleDateString()}</td>
                    <td>{getStatusBadge(y.status)}</td>
                    <td>
                      <button className="button button-outline button-sm mr-2" onClick={() => {
                        setYearData({ name: y.name, start_date: y.start_date.split('T')[0], end_date: y.end_date.split('T')[0], status: y.status })
                        setEditingId(y.id)
                        setShowYearModal(true)
                      }}>Edit</button>
                      <button className="button button-danger-text button-sm" onClick={() => deleteYear(y.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {years.length === 0 && <tr><td colSpan="5" className="text-center text-muted">No academic years defined.</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-container">
            <p className="text-muted mb-4">Define specific semesters within an academic year. The system automatically rolls students over based on these dates.</p>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Term Name</th>
                  <th>Academic Year</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {terms.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.name}</strong></td>
                    <td>{t.academic_year_name}</td>
                    <td>{new Date(t.start_date).toLocaleDateString()}</td>
                    <td>{new Date(t.end_date).toLocaleDateString()}</td>
                    <td>
                      <button className="button button-outline button-sm mr-2" onClick={() => {
                        setTermData({ academic_year_id: t.academic_year_id, name: t.name, start_date: t.start_date.split('T')[0], end_date: t.end_date.split('T')[0] })
                        setEditingId(t.id)
                        setShowTermModal(true)
                      }}>Edit</button>
                      <button className="button button-danger-text button-sm" onClick={() => deleteTerm(t.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {terms.length === 0 && <tr><td colSpan="5" className="text-center text-muted">No academic terms defined.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Modals */}
        {showYearModal && (
          <div className="modal-overlay">
            <div className="modal-content form-modal">
              <h2>{editingId ? 'Edit' : 'Add'} Academic Year</h2>
              <form onSubmit={submitYear}>
                <div className="form-group">
                  <label>Name (e.g. 2026/2027) *</label>
                  <input type="text" name="name" value={yearData.name} onChange={handleYearChange} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>Start Date *</label>
                  <input type="date" name="start_date" value={yearData.start_date} onChange={handleYearChange} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input type="date" name="end_date" value={yearData.end_date} onChange={handleYearChange} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={yearData.status} onChange={handleYearChange} className="form-control">
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="button button-secondary" onClick={() => setShowYearModal(false)}>Cancel</button>
                  <button type="submit" className="button button-primary">Save Year</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showTermModal && (
          <div className="modal-overlay">
            <div className="modal-content form-modal">
              <h2>{editingId ? 'Edit' : 'Add'} Academic Term</h2>
              <form onSubmit={submitTerm}>
                <div className="form-group">
                  <label>Academic Year *</label>
                  <select name="academic_year_id" value={termData.academic_year_id} onChange={handleTermChange} required className="form-control">
                    <option value="">-- Select Year --</option>
                    {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Term Name (e.g. Semester 1) *</label>
                  <input type="text" name="name" value={termData.name} onChange={handleTermChange} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>Start Date *</label>
                  <input type="date" name="start_date" value={termData.start_date} onChange={handleTermChange} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input type="date" name="end_date" value={termData.end_date} onChange={handleTermChange} required className="form-control" />
                </div>
                <div className="modal-actions">
                  <button type="button" className="button button-secondary" onClick={() => setShowTermModal(false)}>Cancel</button>
                  <button type="submit" className="button button-primary">Save Term</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
