import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminSidebar from '../components/AdminSidebar'

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  const [viewingStudent, setViewingStudent] = useState(null)
  const [studentDetails, setStudentDetails] = useState(null)

  useEffect(() => {
    fetchStudents()
  }, [search, statusFilter])

  const fetchStudents = async () => {
    setLoading(true)
    const token = localStorage.getItem('adminToken')
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/students`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search, status: statusFilter }
      })
      setStudents(res.data.data)
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentDetails = async (id) => {
    const token = localStorage.getItem('adminToken')
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStudentDetails(res.data.data)
      setViewingStudent(id)
    } catch (error) {
      alert('Error fetching student details')
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <span className="badge badge-success">Active</span>
      case 'suspended': return <span className="badge badge-danger">Suspended</span>
      case 'deferred': return <span className="badge badge-warning">Deferred</span>
      case 'graduated': return <span className="badge badge-primary">Graduated</span>
      default: return <span className="badge">{status}</span>
    }
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Student Directory</h1>
        </header>

        {!viewingStudent ? (
          <>
            <div className="filters-section" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <input 
                type="text" 
                placeholder="Search name, student number, email..." 
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '200px' }}>
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="deferred">Deferred</option>
                <option value="graduated">Graduated</option>
              </select>
            </div>

            {loading ? <p>Loading students...</p> : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Student Number</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Programme</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id}>
                        <td><strong>{s.student_number}</strong></td>
                        <td>{s.first_name} {s.last_name}</td>
                        <td>{s.email}</td>
                        <td>{s.programme_name}</td>
                        <td>{getStatusBadge(s.current_status)}</td>
                        <td>
                          <button className="button button-outline button-sm" onClick={() => fetchStudentDetails(s.id)}>View Profile</button>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && <tr><td colSpan="6" className="text-center text-muted">No students found.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div>
            <button className="button button-outline mb-4" onClick={() => { setViewingStudent(null); setStudentDetails(null) }}>
              &larr; Back to Directory
            </button>
            {studentDetails && (
              <div className="student-profile">
                <div className="profile-header" style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '2rem' }}>
                  <h2>{studentDetails.profile.first_name} {studentDetails.profile.last_name}</h2>
                  <p className="text-muted">{studentDetails.profile.student_number} | {studentDetails.profile.programme_name}</p>
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Status:</strong> {getStatusBadge(studentDetails.profile.current_status)}
                    <span style={{ marginLeft: '1.5rem' }}><strong>Email:</strong> {studentDetails.profile.email}</span>
                  </div>
                </div>

                <h3>Term Enrollments</h3>
                <div className="table-container mb-4">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Academic Year</th>
                        <th>Term</th>
                        <th>Study Year</th>
                        <th>Study Sem</th>
                        <th>Progression</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentDetails.enrollments.map(e => (
                        <tr key={e.id}>
                          <td>{e.year_name}</td>
                          <td>{e.term_name}</td>
                          <td>Year {e.study_year}</td>
                          <td>Sem {e.study_semester}</td>
                          <td>{e.progression_status}</td>
                        </tr>
                      ))}
                      {studentDetails.enrollments.length === 0 && <tr><td colSpan="5">No enrollments yet.</td></tr>}
                    </tbody>
                  </table>
                </div>

                <h3>Financial Ledger (Invoices)</h3>
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Term</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentDetails.invoices.map(i => (
                        <tr key={i.id}>
                          <td>{new Date(i.created_at).toLocaleDateString()}</td>
                          <td>{i.term_name}</td>
                          <td>{i.description} ({i.fee_type})</td>
                          <td>{i.currency} {Number(i.amount).toLocaleString()}</td>
                          <td>{i.status}</td>
                        </tr>
                      ))}
                      {studentDetails.invoices.length === 0 && <tr><td colSpan="5">No invoices found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
