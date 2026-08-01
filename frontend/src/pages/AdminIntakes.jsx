import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'
import './AdminIntakes.css'

export default function AdminIntakes() {
  const [intakes, setIntakes] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    id: '', name: '', application_start_date: '', application_end_date: '',
    application_fee: '', status: 'active', linkedProgrammes: []
  })
  
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const token = localStorage.getItem('adminToken')
    try {
      const [intakesRes, progsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/intakes`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/programmes`)
      ])
      setIntakes(intakesRes.data.data)
      setProgrammes(progsRes.data.data)
    } catch (err) {
      console.error('Failed to load intakes data:', err)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setFormData({
      id: '', name: '', application_start_date: '', application_end_date: '',
      application_fee: '', status: 'active', linkedProgrammes: []
    })
    setEditMode(false)
    setShowModal(true)
  }

  const openEditModal = (intake) => {
    setFormData({
      id: intake.id,
      name: intake.name,
      application_start_date: intake.application_start_date ? intake.application_start_date.split('T')[0] : '',
      application_end_date: intake.application_end_date ? intake.application_end_date.split('T')[0] : '',
      application_fee: intake.application_fee,
      status: intake.status,
      linkedProgrammes: intake.programmes ? intake.programmes.map(p => ({
        programme_id: p.programme_id,
        intake_status: p.intake_status
      })) : []
    })
    setEditMode(true)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    try {
      if (editMode) {
        await axios.put(`${import.meta.env.VITE_API_URL}/intakes/${formData.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/intakes`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to save intake')
    }
  }

  const handleProgrammeToggle = (programmeId) => {
    setFormData(prev => {
      const exists = prev.linkedProgrammes.find(p => p.programme_id === programmeId)
      if (exists) {
        return { ...prev, linkedProgrammes: prev.linkedProgrammes.filter(p => p.programme_id !== programmeId) }
      } else {
        return { ...prev, linkedProgrammes: [...prev.linkedProgrammes, { programme_id: programmeId, intake_status: 'open' }] }
      }
    })
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Intakes Management</h1>
          <button className="button button-primary" onClick={openAddModal}>+ New Intake</button>
        </header>

        <div className="admin-intakes-container">

      {loading ? <p>Loading intakes...</p> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Application Window</th>
                <th>Fee (KES)</th>
                <th>Status</th>
                <th>Programmes Linked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {intakes.map(intake => (
                <tr key={intake.id}>
                  <td><strong>{intake.name}</strong></td>
                  <td>
                    {intake.application_start_date ? new Date(intake.application_start_date).toLocaleDateString() : 'N/A'}
                    {' — '}
                    {intake.application_end_date ? new Date(intake.application_end_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td>{Number(intake.application_fee).toLocaleString()}</td>
                  <td><span className={`status-badge status-${intake.status}`}>{intake.status}</span></td>
                  <td>{intake.programmes ? intake.programmes.length : 0} programme(s)</td>
                  <td>
                    <button className="button button-secondary" onClick={() => openEditModal(intake)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      {showModal && (
          <div className="modal-overlay">
            <div className="modal-content large">
              <h2>{editMode ? 'Edit Intake' : 'New Intake'}</h2>
              <form onSubmit={handleSubmit} className="intake-form">
                <div className="form-group">
                  <label>Intake Name *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="form-control" placeholder="e.g. September 2026 Intake"/>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Application Opens *</label>
                    <input type="date" value={formData.application_start_date} onChange={e => setFormData({...formData, application_start_date: e.target.value})} required className="form-control"/>
                  </div>
                  <div className="form-group">
                    <label>Application Closes *</label>
                    <input type="date" value={formData.application_end_date} onChange={e => setFormData({...formData, application_end_date: e.target.value})} required className="form-control"/>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Application Fee (KES) *</label>
                    <input type="number" step="0.01" value={formData.application_fee} onChange={e => setFormData({...formData, application_fee: e.target.value})} required className="form-control" placeholder="e.g. 2000"/>
                  </div>
                  <div className="form-group">
                    <label>Status *</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="form-control">
                      <option value="open">Open (Accepting Applications)</option>
                      <option value="upcoming">Upcoming (Not yet open)</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <h3 style={{marginTop: '1.5rem'}}>Linked Programmes</h3>
                <p style={{fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem'}}>Select which programmes are available for this intake.</p>
                <div className="programmes-list">
                  {programmes.map(prog => (
                    <label key={prog.id} className="programme-checkbox">
                      <input
                        type="checkbox"
                        checked={!!formData.linkedProgrammes.find(p => p.programme_id === prog.id)}
                        onChange={() => handleProgrammeToggle(prog.id)}
                      />
                      {prog.name} <span style={{fontSize:'0.8rem',color:'#888'}}>({prog.level})</span>
                    </label>
                  ))}
                </div>

                <div className="modal-actions">
                  <button type="button" className="button button-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="button button-primary">Save Intake</button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  )
}
