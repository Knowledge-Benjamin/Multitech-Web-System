import { useApiQuery } from '../hooks/useApiQuery'
import StudentSidebar from '../components/StudentSidebar'

export default function StudentFinances() {
  const token = localStorage.getItem('studentToken')
  const { data, isLoading } = useApiQuery(`${import.meta.env.VITE_API_URL}/student-profile/invoices`, {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const invoices = data?.data?.invoices || []
  const summary = data?.data?.summary || {
    totalBilled: 0,
    totalPaid: 0,
    outstandingBalance: 0,
    isClearedForExams: false
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
    <div className="scope-studentfinances admin-layout">
      <StudentSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)' }}>
        <header className="content-header hide-on-print">
          <h1>Financial Statements</h1>
          <button className="button button-primary hide-on-print">Make a Payment</button>
        </header>

        {isLoading ? <p>Loading financial records...</p> : (
          <>
            {/* Financial Summary & Exam Pass */}
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              
              {/* Balances */}
              <div style={{ flex: '1', display: 'flex', gap: '1rem' }}>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', flex: '1', border: '1px solid var(--color-border)' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Billed</p>
                  <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem' }}>UGX {summary.totalBilled.toLocaleString()}</h3>
                </div>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', flex: '1', border: '1px solid var(--color-border)' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Paid</p>
                  <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', color: 'var(--color-success)' }}>UGX {summary.totalPaid.toLocaleString()}</h3>
                </div>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', flex: '1', border: '1px solid var(--color-border)' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Outstanding Balance</p>
                  <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', color: summary.outstandingBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    UGX {summary.outstandingBalance.toLocaleString()}
                  </h3>
                </div>
              </div>

              {/* Digital Exam Pass Card */}
              <div style={{ 
                background: summary.isClearedForExams ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f43f5e, #e11d48)', 
                color: 'white', padding: '1.5rem', borderRadius: '12px', minWidth: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' 
              }}>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>
                  {summary.isClearedForExams ? '🎓 EXAM PASS' : '❌ NOT CLEARED'}
                </h2>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', opacity: 0.9 }}>
                  {summary.isClearedForExams ? 'Financially Cleared for Exams' : 'Outstanding Balance Requires Payment'}
                </p>
                {summary.isClearedForExams && (
                  <button onClick={() => window.print()} className="button hide-on-print" style={{ background: 'white', color: '#059669', border: 'none', fontWeight: 'bold' }}>
                    🖨️ Print Pass
                  </button>
                )}
              </div>

            </div>

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
          </>
        )}
        <style>{`
          @media print {
            .admin-sidebar, .hide-on-print, .sidebar-toggle { display: none !important; }
            .admin-layout { display: block; }
            .admin-content { margin: 0 !important; width: 100% !important; max-width: 100% !important; }
          }
        `}</style>
      </main>
    </div>
  )
}
