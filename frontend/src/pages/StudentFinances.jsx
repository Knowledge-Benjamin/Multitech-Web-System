import { useState, useEffect } from 'react'
import axios from 'axios'
import StudentSidebar from '../components/StudentSidebar'

export default function StudentFinances() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    const token = localStorage.getItem('studentToken')
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/student-profile/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setInvoices(res.data.data)
    } catch (error) {
      console.error('Error fetching invoices', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'paid': return <span className="badge badge-success">Paid</span>
      case 'partial': return <span className="badge badge-warning">Partial</span>
      case 'unpaid': return <span className="badge badge-danger">Unpaid</span>
      case 'void': return <span className="badge badge-neutral">Void</span>
      default: return <span className="badge">{status}</span>
    }
  }

  return (
    <div className="admin-layout">
      <StudentSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)' }}>
        <header className="content-header">
          <h1>Financial Statements</h1>
          <button className="button button-primary">Make a Payment</button>
        </header>

        {loading ? <p>Loading financial records...</p> : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date Issued</th>
                  <th>Term</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(i => (
                  <tr key={i.id}>
                    <td>{new Date(i.created_at).toLocaleDateString()}</td>
                    <td>{i.term_name}</td>
                    <td>{i.description}</td>
                    <td><strong>{i.currency} {Number(i.amount).toLocaleString()}</strong></td>
                    <td>{i.due_date ? new Date(i.due_date).toLocaleDateString() : 'N/A'}</td>
                    <td>{getStatusBadge(i.status)}</td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan="6" className="text-center text-muted">No invoices found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
