import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'
import './AdminArticles.css'

export default function AdminHomeReasons() {
  const [reasons, setReasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [current, setCurrent] = useState(null)

  const initial = { icon: '', title: '', points: [''], status: 'draft', display_order: 0 }
  const [form, setForm] = useState(initial)

  useEffect(() => { fetchReasons() }, [])

  const fetchReasons = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/home/reasons/admin`, { headers: { Authorization: `Bearer ${token}` } })
      setReasons(res.data.data)
    } catch (err) {
      setError('Failed to load reasons')
    } finally { setLoading(false) }
  }

  const handleInput = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handlePointChange = (idx, val) => setForm(prev => ({ ...prev, points: prev.points.map((p,i) => i===idx?val:p) }))
  const addPoint = () => setForm(prev => ({ ...prev, points: [...prev.points, ''] }))
  const removePoint = (idx) => setForm(prev => ({ ...prev, points: prev.points.filter((_,i)=>i!==idx) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    const token = localStorage.getItem('adminToken')
    const config = { headers: { Authorization: `Bearer ${token}` } }
    const payload = { ...form }
    try {
      if (isEditing) {
        await axios.put(`${import.meta.env.VITE_API_URL}/home/reasons/admin/${current.id}`, payload, config)
        setSuccess('Updated')
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/home/reasons/admin`, payload, config)
        setSuccess('Created')
      }
      setForm(initial); setIsEditing(false); setCurrent(null); fetchReasons()
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed')
    } finally { setLoading(false) }
  }

  const handleEdit = (r) => { setCurrent(r); setForm({ icon: r.icon||'', title: r.title||'', points: r.points||[''], status: r.status, display_order: r.display_order||0 }); setIsEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const handleDelete = async (id) => {
    if (!confirm('Delete reason?')) return
    try {
      const token = localStorage.getItem('adminToken')
      await axios.delete(`${import.meta.env.VITE_API_URL}/home/reasons/admin/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      setSuccess('Deleted'); fetchReasons()
    } catch (err) { setError('Delete failed') }
  }

  return (
    <div className="scope-adminhomereasons admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header"><h1>Manage Homepage Reasons</h1></header>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="admin-form-section">
          <h2>{isEditing? 'Edit Reason':'Create New Reason'}</h2>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label>Icon</label>
              <select name="icon" value={form.icon} onChange={handleInput} required>
                <option value="">Select an icon...</option>
                <option value="Award">Award</option>
                <option value="BookOpen">Book</option>
                <option value="Building">Building</option>
                <option value="Briefcase">Briefcase</option>
                <option value="GraduationCap">Graduation Cap</option>
                <option value="Globe">Globe</option>
                <option value="Users">Users</option>
                <option value="TrendingUp">Trending Up</option>
                <option value="Target">Target</option>
                <option value="Shield">Shield</option>
                <option value="CheckCircle">Check Circle</option>
                <option value="Lightbulb">Lightbulb</option>
                <option value="Star">Star</option>
                <option value="Rocket">Rocket</option>
                <option value="MonitorPlay">Online Learning</option>
              </select>
            </div>
            <div className="form-group"><label>Title *</label><input name="title" value={form.title} onChange={handleInput} required /></div>
            <div className="form-group"><label>Points / Explanation</label>
              {form.points.map((p,idx)=>(
                <div key={idx} style={{display:'flex',gap:'0.5rem',marginBottom:'0.5rem'}}>
                  <input value={p} onChange={(e)=>handlePointChange(idx,e.target.value)} style={{flex:1}} />
                  <button type="button" className="button button-danger" onClick={()=>removePoint(idx)}>Remove</button>
                </div>
              ))}
              <button type="button" className="button button-secondary" onClick={addPoint}>Add Point</button>
            </div>
            <div className="form-group"><label>Status</label>
              <select name="status" value={form.status} onChange={handleInput}><option value="draft">Draft</option><option value="published">Published</option></select>
            </div>
            <div className="form-group"><label>Display order</label><input name="display_order" type="number" value={form.display_order} onChange={handleInput} /></div>
            <div className="form-actions"><button className="button button-primary" type="submit">{isEditing? 'Update':'Create'}</button>{isEditing && <button type="button" className="button button-secondary" onClick={()=>{setForm(initial);setIsEditing(false);setCurrent(null)}}>Cancel</button>}</div>
          </form>
        </div>

        <div className="admin-list-section">
          <h2>Existing Reasons</h2>
          {loading && !reasons.length ? <p>Loading...</p> : (
            <div className="data-table">
              <table>
                <thead><tr><th>Title</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead>
                <tbody>
                  {reasons.map(r=> (
                    <tr key={r.id}><td>{r.title}</td><td>{r.status}</td><td>{r.display_order}</td><td>
                      <button className="button button-small button-secondary" onClick={()=>handleEdit(r)}>Edit</button>
                      <button className="button button-small button-danger" onClick={()=>handleDelete(r.id)}>Delete</button>
                    </td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
