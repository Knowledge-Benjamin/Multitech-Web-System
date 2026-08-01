import { useState } from 'react'
import axios from 'axios'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'
import './AdminFees.css'

export default function AdminFees() {
  const [activeTab, setActiveTab] = useState('functional') // 'functional' or 'programme_specific'

  // Modals
  const [showFuncModal, setShowFuncModal] = useState(false)
  const [showProgModal, setShowProgModal] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [funcFormData, setFuncFormData] = useState({ fee_name: '', national_amount: '', international_amount: '', description: '', is_mandatory: true })
  const [progFormData, setProgFormData] = useState({ programme_id: '', fee_name: '', national_amount: '', international_amount: '', description: '', is_mandatory: true })

  const token = localStorage.getItem('adminToken')
  
  const { data: funcFeesData, isLoading: loadingFunc, refetch: fetchFuncFees } = useApiQuery('/functional-fees', 'adminFuncFees', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })
  
  const { data: progFeesData, isLoading: loadingProgFees, refetch: fetchProgFees } = useApiQuery('/programme-fees', 'adminProgFees', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })
  
  const { data: programmesData, isLoading: loadingProgrammes } = useApiQuery('/programmes', 'adminProgrammes')

  const functionalFees = funcFeesData?.data || []
  const programmeFees = progFeesData?.data || []
  const programmes = programmesData?.data || []
  
  const loading = loadingFunc || loadingProgFees || loadingProgrammes
  
  const fetchData = () => {
    fetchFuncFees()
    fetchProgFees()
  }

  // Functional Fees Handlers
  const handleFuncChange = (e) => {
    const { name, value, type, checked } = e.target
    setFuncFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const submitFuncFee = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/functional-fees/${editingId}`, funcFormData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/functional-fees`, funcFormData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      setShowFuncModal(false)
      setEditingId(null)
      fetchData()
    } catch (error) {
      console.error('Error saving functional fee:', error)
      alert('Error saving fee')
    }
  }

  const deleteFuncFee = async (id) => {
    if (!confirm('Are you sure you want to delete this functional fee?')) return
    const token = localStorage.getItem('adminToken')
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/functional-fees/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
    } catch (error) {
      console.error('Error deleting functional fee:', error)
      alert('Error deleting fee')
    }
  }

  // Programme Specific Fees Handlers
  const handleProgChange = (e) => {
    const { name, value, type, checked } = e.target
    setProgFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const submitProgFee = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/programme-fees/${editingId}`, progFormData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/programme-fees`, progFormData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      setShowProgModal(false)
      setEditingId(null)
      fetchData()
    } catch (error) {
      console.error('Error saving programme fee:', error)
      alert('Error saving fee')
    }
  }

  const deleteProgFee = async (id) => {
    if (!confirm('Are you sure you want to delete this programme fee?')) return
    const token = localStorage.getItem('adminToken')
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/programme-fees/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
    } catch (error) {
      console.error('Error deleting programme fee:', error)
      alert('Error deleting fee')
    }
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Fee Management</h1>
          {activeTab === 'functional' ? (
            <button className="button button-primary" onClick={() => {
              setFuncFormData({ fee_name: '', national_amount: '', international_amount: '', description: '', is_mandatory: true })
              setEditingId(null)
              setShowFuncModal(true)
            }}>+ Add Functional Fee</button>
          ) : (
            <button className="button button-primary" onClick={() => {
              setProgFormData({ programme_id: '', fee_name: '', national_amount: '', international_amount: '', description: '', is_mandatory: true })
              setEditingId(null)
              setShowProgModal(true)
            }}>+ Add Programme Fee</button>
          )}
        </header>

        <div className="settings-tabs" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border)' }}>
          <button
            onClick={() => setActiveTab('functional')}
            className={`tab-btn ${activeTab === 'functional' ? 'active' : ''}`}
            style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'functional' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'functional' ? 'var(--color-primary)' : 'var(--color-text)', cursor: 'pointer', fontWeight: activeTab === 'functional' ? '600' : '400' }}
          >
            Global Functional Fees
          </button>
          <button
            onClick={() => setActiveTab('programme_specific')}
            className={`tab-btn ${activeTab === 'programme_specific' ? 'active' : ''}`}
            style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'programme_specific' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'programme_specific' ? 'var(--color-primary)' : 'var(--color-text)', cursor: 'pointer', fontWeight: activeTab === 'programme_specific' ? '600' : '400' }}
          >
            Programme-Specific Fees
          </button>
        </div>

        {loading ? (
          <p>Loading fees...</p>
        ) : activeTab === 'functional' ? (
          <div className="fee-table-container">
            <p className="section-desc">These fees apply to all students regardless of their programme (e.g., Registration, ID Card, NCHE).</p>
            {functionalFees.length > 0 ? (
              <table className="fee-table">
                <thead>
                  <tr>
                    <th>Fee Name</th>
                    <th>National (UGX)</th>
                    <th>Intl (USD)</th>
                    <th>Mandatory</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {functionalFees.map(fee => (
                    <tr key={fee.id}>
                      <td><strong>{fee.fee_name}</strong></td>
                      <td>{parseInt(fee.national_amount).toLocaleString()}</td>
                      <td>{parseInt(fee.international_amount).toLocaleString()}</td>
                      <td>{fee.is_mandatory ? <span className="badge badge-success">Yes</span> : <span className="badge badge-neutral">No</span>}</td>
                      <td className="text-muted">{fee.description || '-'}</td>
                      <td>
                        <button className="button button-outline button-sm mr-2" onClick={() => {
                          setFuncFormData(fee)
                          setEditingId(fee.id)
                          setShowFuncModal(true)
                        }}>Edit</button>
                        <button className="button button-danger-text button-sm" onClick={() => deleteFuncFee(fee.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">No functional fees defined.</div>
            )}
          </div>
        ) : (
          <div className="fee-table-container">
            <p className="section-desc">These fees apply only to students enrolled in specific programmes (e.g., Lab Fee, Fieldwork Fee).</p>
            {programmeFees.length > 0 ? (
              <table className="fee-table">
                <thead>
                  <tr>
                    <th>Programme</th>
                    <th>Fee Name</th>
                    <th>National (UGX)</th>
                    <th>Intl (USD)</th>
                    <th>Mandatory</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programmeFees.map(fee => (
                    <tr key={fee.id}>
                      <td>{fee.programme_name}</td>
                      <td><strong>{fee.fee_name}</strong></td>
                      <td>{parseInt(fee.national_amount).toLocaleString()}</td>
                      <td>{parseInt(fee.international_amount).toLocaleString()}</td>
                      <td>{fee.is_mandatory ? <span className="badge badge-success">Yes</span> : <span className="badge badge-neutral">No</span>}</td>
                      <td>
                        <button className="button button-outline button-sm mr-2" onClick={() => {
                          setProgFormData(fee)
                          setEditingId(fee.id)
                          setShowProgModal(true)
                        }}>Edit</button>
                        <button className="button button-danger-text button-sm" onClick={() => deleteProgFee(fee.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">No programme-specific fees defined.</div>
            )}
          </div>
        )}

        {/* Functional Fee Modal */}
        {showFuncModal && (
          <div className="modal-overlay">
            <div className="modal-content form-modal">
              <h2>{editingId ? 'Edit' : 'Add'} Functional Fee</h2>
              <form onSubmit={submitFuncFee}>
                <div className="form-group">
                  <label>Fee Name *</label>
                  <input type="text" name="fee_name" value={funcFormData.fee_name} onChange={handleFuncChange} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>National Amount (UGX) *</label>
                  <input type="number" name="national_amount" value={funcFormData.national_amount} onChange={handleFuncChange} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>International Amount (USD) *</label>
                  <input type="number" name="international_amount" value={funcFormData.international_amount} onChange={handleFuncChange} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={funcFormData.description} onChange={handleFuncChange} className="form-control" rows="2" />
                </div>
                <div className="form-group checkbox-align">
                  <label>
                    <input type="checkbox" name="is_mandatory" checked={funcFormData.is_mandatory} onChange={handleFuncChange} />
                    Mandatory Fee
                  </label>
                </div>
                <div className="modal-actions">
                  <button type="button" className="button button-secondary" onClick={() => setShowFuncModal(false)}>Cancel</button>
                  <button type="submit" className="button button-primary">Save Fee</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Programme Specific Fee Modal */}
        {showProgModal && (
          <div className="modal-overlay">
            <div className="modal-content form-modal">
              <h2>{editingId ? 'Edit' : 'Add'} Programme Fee</h2>
              <form onSubmit={submitProgFee}>
                <div className="form-group">
                  <label>Programme *</label>
                  <select name="programme_id" value={progFormData.programme_id} onChange={handleProgChange} required className="form-control">
                    <option value="">-- Select Programme --</option>
                    {programmes.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fee Name *</label>
                  <input type="text" name="fee_name" value={progFormData.fee_name} onChange={handleProgChange} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>National Amount (UGX) *</label>
                  <input type="number" name="national_amount" value={progFormData.national_amount} onChange={handleProgChange} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>International Amount (USD) *</label>
                  <input type="number" name="international_amount" value={progFormData.international_amount} onChange={handleProgChange} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={progFormData.description} onChange={handleProgChange} className="form-control" rows="2" />
                </div>
                <div className="form-group checkbox-align">
                  <label>
                    <input type="checkbox" name="is_mandatory" checked={progFormData.is_mandatory} onChange={handleProgChange} />
                    Mandatory Fee
                  </label>
                </div>
                <div className="modal-actions">
                  <button type="button" className="button button-secondary" onClick={() => setShowProgModal(false)}>Cancel</button>
                  <button type="submit" className="button button-primary">Save Fee</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
