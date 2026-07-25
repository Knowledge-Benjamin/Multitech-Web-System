import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts'

const API = import.meta.env.VITE_API_URL

export default function AdminAttendanceReports() {
  const token = localStorage.getItem('adminToken')
  const headers = { Authorization: `Bearer ${token}` }

  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal / Detail state
  const [selectedSession, setSelectedSession] = useState(null)
  const [records, setRecords] = useState([])
  const [loadingRecords, setLoadingRecords] = useState(false)

  useEffect(() => { loadSessions() }, [])

  const loadSessions = async () => {
    try {
      const res = await axios.get(`${API}/attendance/sessions`, { headers })
      setSessions(res.data.sessions || [])
    } catch (err) {
      setError('Failed to load historical sessions')
    } finally {
      setLoading(false)
    }
  }

  const handleViewSession = async (session) => {
    setSelectedSession(session)
    setLoadingRecords(true)
    try {
      const res = await axios.get(`${API}/attendance/sessions/${session.id}`, { headers })
      setRecords(res.data.records || [])
    } catch (err) {
      alert('Failed to load records for this session.')
    } finally {
      setLoadingRecords(false)
    }
  }

  const mapData = records
    .filter(r => r.x_coord !== null && r.y_coord !== null)
    .map(r => ({ x: Number(r.x_coord), y: Number(r.y_coord), name: r.username }))

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content" style={{ background: '#0f172a', padding: '2rem', color: '#f1f5f9' }}>
        <h1 style={{ margin: '0 0 0.5rem 0' }}>📋 Attendance Reports</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 2rem 0' }}>Audit past class sessions and verify student attendance.</p>
        
        {error && <div className="alert alert-danger">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: selectedSession ? '1fr 1fr' : '1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Left: Session List */}
          <div className="table-container" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
            {loading ? <p style={{ padding: '2rem', textAlign: 'center' }}>Loading...</p> : (
              <table className="admin-table" style={{ background: 'transparent' }}>
                <thead>
                  <tr>
                    <th style={{ color: '#94a3b8' }}>Date</th>
                    <th style={{ color: '#94a3b8' }}>Course</th>
                    <th style={{ color: '#94a3b8' }}>Room</th>
                    <th style={{ color: '#94a3b8' }}>Present</th>
                    <th style={{ color: '#94a3b8' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td>{new Date(s.end_time).toLocaleDateString()}</td>
                      <td>
                        <strong>{s.course_code}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s.course_name}</div>
                      </td>
                      <td>{s.room_name}</td>
                      <td>
                        <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 600 }}>
                          {s.present_count}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="button button-primary" 
                          style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
                          onClick={() => handleViewSession(s)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No historical sessions found.</td></tr>}
                </tbody>
              </table>
            )}
          </div>

          {/* Right: Session Details */}
          {selectedSession && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.2rem 0' }}>{selectedSession.course_code}</h3>
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{new Date(selectedSession.end_time).toLocaleString()}</div>
                </div>
                <button onClick={() => setSelectedSession(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
              </div>

              {loadingRecords ? <p>Loading records...</p> : (
                <>
                  {/* Heatmap */}
                  {mapData.length > 0 && (
                    <div style={{ height: '300px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '1.5rem', padding: '1rem' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#cbd5e1', fontSize: '0.85rem' }}>Spatial Heatmap</h4>
                      <ResponsiveContainer width="100%" height="90%">
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                          <XAxis type="number" dataKey="x" hide domain={['dataMin - 1', 'dataMax + 1']} />
                          <YAxis type="number" dataKey="y" reversed hide domain={[0, 'dataMax + 1']} />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }}
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                            formatter={(val, name, props) => [props.payload.name, 'Student']}
                          />
                          <ReferenceDot x={0} y={0} r={6} fill="#ef4444" stroke="none" />
                          <Scatter data={mapData} fill="#3b82f6" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* List */}
                  <h4 style={{ margin: '0 0 0.8rem 0', color: '#cbd5e1', fontSize: '0.9rem' }}>Student Roster ({records.length})</h4>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {records.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{r.username}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{r.email}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: r.verification_type === 'BLE_Mesh' ? 'rgba(59,130,246,0.2)' : 'rgba(148,163,184,0.2)', color: r.verification_type === 'BLE_Mesh' ? '#93c5fd' : '#cbd5e1' }}>
                            {r.verification_type.replace('_', ' ')}
                          </span>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
                            {new Date(r.scan_time).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
