import { useApiQuery } from '../hooks/useApiQuery'
import StudentSidebar from '../components/StudentSidebar'
import { ShieldCheck, AlertCircle, Printer, CreditCard, RefreshCw } from 'lucide-react'
import './AdminDashboard.css'

const formatMoney = (currency, amount) => (
  `${currency || 'UGX'} ${Number(amount || 0).toLocaleString('en-UG', { maximumFractionDigits: 2 })}`
)

export default function StudentFinances() {
  const token = localStorage.getItem('studentToken')
  const { data, isLoading, isError, refetch } = useApiQuery(`${import.meta.env.VITE_API_URL}/student-profile/invoices`, 'studentInvoices', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const invoices = data?.data?.invoices || []
  const summary = data?.data?.summary || {
    currencies: [],
    isClearedForExams: false
  }
  const currencies = summary.currencies || []

  const getStatusBadge = (status) => {
    switch(status) {
      case 'paid': return <span className="status-pill status-admitted">Paid</span>
      case 'partial': return <span className="status-pill status-pending">Partial</span>
      case 'unpaid': return <span className="status-pill status-rejected">Unpaid</span>
      case 'void': return <span className="status-pill">Void</span>
      default: return <span className="status-pill">{status}</span>
    }
  }

  return (
    <div className="scope-studentfinances scope-admindashboard admin-layout">
      <StudentSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)' }}>
        <header className="content-header hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-secondary)', margin: 0 }}>Financial Statements</h1>
            <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0' }}>Tuition, functional fees, and official invoice history</p>
          </div>
        </header>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading financial records...</p>
          </div>
        ) : isError ? (
          <div className="recent-section" role="alert">
            <div className="section-header">
              <h2>Financial records unavailable</h2>
              <button type="button" className="button button-outline" onClick={() => refetch()}>
                <RefreshCw size={15} /> Retry
              </button>
            </div>
            <p>Your invoice information could not be loaded. Please try again.</p>
          </div>
        ) : (
          <>
            {/* Financial Summary & Exam Clearance */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              
              {/* Balances Grid */}
              <div style={{ flex: '2', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
                {currencies.map(balance => (
                  <div className="stat-card" style={{ padding: '1.25rem' }} key={balance.currency}>
                    <div className="stat-content">
                      <h3>{balance.currency} · Total invoiced</h3>
                      <p className="stat-number" style={{ fontSize: '1.4rem' }}>{formatMoney(balance.currency, balance.totalBilled)}</p>
                      <span className="trend neutral" style={{ marginTop: '0.35rem' }}>
                        {formatMoney(balance.currency, balance.totalPaid)} allocated to invoices
                      </span>
                      <span className={`trend ${balance.outstandingBalance > 0 ? 'neutral' : 'positive'}`} style={{ marginTop: '0.35rem' }}>
                        {formatMoney(balance.currency, balance.outstandingBalance)} outstanding
                      </span>
                    </div>
                  </div>
                ))}
                {currencies.length === 0 && (
                  <div className="stat-card" style={{ padding: '1.25rem' }}>
                    <div className="stat-content">
                      <h3>Invoice balance</h3>
                      <p className="stat-number" style={{ fontSize: '1.1rem' }}>No invoices recorded</p>
                      <span className="trend neutral" style={{ marginTop: '0.35rem' }}>Your account has no active charges.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Digital Exam Pass Status Card */}
              <div style={{ 
                flex: '1',
                minWidth: '280px',
                background: summary.isClearedForExams 
                  ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)' 
                  : 'linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)',
                color: 'white',
                padding: '1.75rem',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    {summary.isClearedForExams ? <ShieldCheck size={22} /> : <AlertCircle size={22} />}
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, opacity: 0.9 }}>
                      Exam Clearance
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.35rem', color: '#ffffff' }}>
                    {summary.isClearedForExams ? 'Eligible for Exams' : 'Payment Required'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.4 }}>
                    {summary.isClearedForExams
                      ? 'Fees cleared. You are officially authorized to sit for term examinations.'
                      : 'Outstanding balance pending. Please clear your balance to generate your exam pass.'}
                  </p>
                </div>

                {summary.isClearedForExams && (
                  <button 
                    onClick={() => window.print()} 
                    className="button hide-on-print" 
                    style={{ 
                      marginTop: '1.25rem',
                      background: 'rgba(255,255,255,0.95)', 
                      color: '#065f46', 
                      border: 'none', 
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '0.65rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={16} /> Print Examination Pass
                  </button>
                )}
              </div>

            </div>

            {/* Invoices Table */}
            <div className="recent-section">
              <div className="section-header">
                <h2>Invoice Ledger</h2>
              </div>
              <div className="table-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Date Issued</th>
                      <th>Academic Term</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length > 0 ? (
                      invoices.map(i => (
                        <tr key={i.id}>
                          <td>{new Date(i.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td><strong>{i.term_name || 'General Term'}</strong></td>
                          <td>{i.description}</td>
                          <td><strong>{formatMoney(i.currency, i.amount)}</strong></td>
                          <td>{formatMoney(i.currency, i.amount_paid)}</td>
                          <td>{formatMoney(i.currency, i.balance)}</td>
                          <td>{i.due_date ? new Date(i.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'End of Term'}</td>
                          <td>{getStatusBadge(i.ledger_status)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="empty-state">
                          <p>No invoices found on your account.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
