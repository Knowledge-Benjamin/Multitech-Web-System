import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  ArrowUpRight, BadgeDollarSign, Banknote, BookOpen, Check, ChevronLeft,
  ChevronRight, CircleAlert, CreditCard, GraduationCap, History, Plus,
  Receipt, Search, ShieldCheck, UserRound, Users, X
} from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'
import './AdminFees.css'

const API = import.meta.env.VITE_API_URL || '/api'
const PAGE_SIZE = 10
const formatMoney = (currency, amount) => (
  `${currency || 'UGX'} ${Number(amount || 0).toLocaleString('en-UG', { maximumFractionDigits: 2 })}`
)
const formatDate = (value) => {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not recorded'
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
const requestMessage = (error, fallback) => error.response?.data?.message || fallback
const getName = value => `${value.first_name || ''} ${value.last_name || ''}`.trim()

const EMPTY_FEE = {
  programme_id: '',
  fee_name: '',
  national_amount: '',
  international_amount: '',
  description: '',
  is_mandatory: true
}
const EMPTY_INVOICE = {
  academic_term_id: '',
  fee_type: 'tuition',
  description: '',
  amount: '',
  currency: 'UGX',
  due_date: ''
}

function StatusPill({ status }) {
  return <span className={`fees-status-pill fees-status-pill--${status}`}>{status}</span>
}

export default function AdminFees() {
  const [activeTab, setActiveTab] = useState('ledger')
  const [scheduleTab, setScheduleTab] = useState('tuition')
  const [search, setSearch] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currencyFilter, setCurrencyFilter] = useState('all')
  const [termFilter, setTermFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [activeModal, setActiveModal] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [feeType, setFeeType] = useState('functional')
  const [feeForm, setFeeForm] = useState(EMPTY_FEE)
  const [tuitionProgramme, setTuitionProgramme] = useState(null)
  const [tuitionForm, setTuitionForm] = useState({ national_tuition_fee: '', international_tuition_fee: '' })
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)
  const [invoiceDetail, setInvoiceDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'bank_transfer', reference_code: '' })
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [pageError, setPageError] = useState('')
  const [pageNotice, setPageNotice] = useState('')
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)

  const token = localStorage.getItem('adminToken')
  const headers = { Authorization: `Bearer ${token}` }
  const invoiceParams = {
    page,
    limit: PAGE_SIZE,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(currencyFilter !== 'all' ? { currency: currencyFilter } : {}),
    ...(termFilter !== 'all' ? { academic_term_id: termFilter } : {})
  }

  const {
    data: overviewData,
    isLoading: loadingOverview,
    error: overviewError,
    refetch: refetchOverview
  } = useApiQuery('/admin/finance/overview', 'adminFinanceOverview', {
    axiosOptions: { headers }
  })
  const {
    data: invoicesData,
    isLoading: loadingInvoices,
    isFetching: fetchingInvoices,
    error: invoicesError,
    refetch: refetchInvoices
  } = useApiQuery('/admin/finance/invoices', ['adminFinanceInvoices', invoiceParams], {
    axiosOptions: { headers, params: invoiceParams },
    queryOptions: { enabled: activeTab === 'ledger' }
  })
  const {
    data: functionalFeesData,
    isLoading: loadingFunctionalFees,
    error: functionalFeesError,
    refetch: refetchFunctionalFees
  } = useApiQuery('/functional-fees', 'adminFunctionalFees', {
    axiosOptions: { headers },
    queryOptions: { enabled: activeTab === 'schedule' && scheduleTab === 'functional' }
  })
  const {
    data: programmeFeesData,
    isLoading: loadingProgrammeFees,
    error: programmeFeesError,
    refetch: refetchProgrammeFees
  } = useApiQuery('/programme-fees', 'adminProgrammeFees', {
    axiosOptions: { headers },
    queryOptions: { enabled: activeTab === 'schedule' && scheduleTab === 'programme' }
  })
  const {
    data: tuitionData,
    isLoading: loadingTuition,
    error: tuitionError,
    refetch: refetchTuition
  } = useApiQuery('/admin/finance/tuition-rates', 'adminFinanceTuitionRates', {
    axiosOptions: { headers },
    queryOptions: { enabled: activeTab === 'schedule' && scheduleTab === 'tuition' }
  })
  const {
    data: programmesData,
    isLoading: loadingProgrammes,
    error: programmesError,
    refetch: refetchProgrammes
  } = useApiQuery('/programmes/admin/all', 'adminFinanceProgrammes', {
    axiosOptions: { headers },
    queryOptions: { enabled: activeTab === 'schedule' && scheduleTab === 'programme' }
  })
  const {
    data: termsData,
    isLoading: loadingTerms,
    error: termsError,
    refetch: refetchTerms
  } = useApiQuery('/calendar/terms', 'adminFinanceTerms', {
    axiosOptions: { headers }
  })
  const {
    data: studentSearchData,
    isFetching: searchingStudents
  } = useApiQuery('/admin/finance/students', ['adminFinanceStudentSearch', studentSearch], {
    axiosOptions: { headers, params: { search: studentSearch.trim() } },
    queryOptions: { enabled: activeModal === 'invoice' && studentSearch.trim().length >= 2 }
  })

  const overview = overviewData?.data || { currencies: [], payments: [], recentPayments: [] }
  const invoices = invoicesData?.data || []
  const pagination = invoicesData?.pagination || { page: 1, total: 0, totalPages: 0 }
  const terms = termsData?.data || []
  const functionalFees = functionalFeesData?.data || []
  const programmeFees = programmeFeesData?.data || []
  const tuitionRates = tuitionData?.data || []
  const programmes = programmesData?.data || []
  const studentOptions = studentSearchData?.data || []

  const paymentSummary = useMemo(() => {
    const summaries = new Map(overview.currencies.map(row => [row.currency, { ...row }]))
    overview.payments.forEach(payment => {
      const current = summaries.get(payment.currency) || {
        currency: payment.currency,
        invoice_count: 0,
        billed: 0,
        applied: 0,
        outstanding: 0,
        open_invoice_count: 0
      }
      current.received = payment.received
      current.receipt_count = payment.receipt_count
      current.received_last_30_days = payment.received_last_30_days
      summaries.set(payment.currency, current)
    })
    return [...summaries.values()].sort((a, b) => a.currency.localeCompare(b.currency))
  }, [overview.currencies, overview.payments])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, currencyFilter, termFilter])

  useEffect(() => {
    if (!activeModal) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !saving) closeModal()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [activeModal, saving])

  useEffect(() => {
    if (!selectedStudent) return
    const country = selectedStudent.country_of_residence?.trim().toLowerCase()
    setInvoiceForm(previous => ({ ...previous, currency: country && country !== 'uganda' ? 'USD' : 'UGX' }))
  }, [selectedStudent])

  const clearMessages = () => {
    setPageError('')
    setPageNotice('')
    setModalError('')
  }

  const closeModal = () => {
    setActiveModal('')
    setModalError('')
  }

  const refreshLedger = async () => {
    await Promise.all([refetchOverview(), refetchInvoices()])
  }

  const openFeeForm = (type, fee = null) => {
    clearMessages()
    setFeeType(type)
    setEditingId(fee?.id || null)
    setFeeForm(fee
      ? {
          programme_id: fee.programme_id || '',
          fee_name: fee.fee_name || '',
          national_amount: fee.national_amount ?? '',
          international_amount: fee.international_amount ?? '',
          description: fee.description || '',
          is_mandatory: Boolean(fee.is_mandatory)
        }
      : { ...EMPTY_FEE })
    setActiveModal('fee')
  }

  const saveFee = async (event) => {
    event.preventDefault()
    setSaving(true)
    setModalError('')
    try {
      const path = feeType === 'functional' ? '/functional-fees' : '/programme-fees'
      const payload = {
        ...feeForm,
        national_amount: Number(feeForm.national_amount),
        international_amount: Number(feeForm.international_amount),
        ...(feeType === 'programme' ? { programme_id: Number(feeForm.programme_id) } : {})
      }
      const request = editingId
        ? axios.put(`${API}${path}/${editingId}`, payload, { headers })
        : axios.post(`${API}${path}`, payload, { headers })
      await request
      closeModal()
      setPageNotice(editingId ? 'Fee schedule updated.' : 'Fee added to the schedule.')
      if (feeType === 'functional') await refetchFunctionalFees()
      else await refetchProgrammeFees()
    } catch (requestError) {
      setModalError(requestMessage(requestError, 'The fee could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  const setFeeActive = async (fee, type) => {
    clearMessages()
    try {
      const path = type === 'functional' ? '/functional-fees' : '/programme-fees'
      await axios.put(`${API}${path}/${fee.id}`, { active: !fee.active }, { headers })
      setPageNotice(fee.active
        ? 'Fee deactivated. Existing invoices have not changed.'
        : 'Fee reactivated for future fee schedules.')
      if (type === 'functional') await refetchFunctionalFees()
      else await refetchProgrammeFees()
    } catch (requestError) {
      setPageError(requestMessage(requestError, 'Fee status could not be changed.'))
    }
  }

  const openTuitionForm = (programme) => {
    clearMessages()
    setTuitionProgramme(programme)
    setTuitionForm({
      national_tuition_fee: programme.national_tuition_fee ?? programme.tuition_fee ?? 0,
      international_tuition_fee: programme.international_tuition_fee ?? 0
    })
    setActiveModal('tuition')
  }

  const saveTuition = async (event) => {
    event.preventDefault()
    if (!tuitionProgramme) return
    setSaving(true)
    setModalError('')
    try {
      await axios.put(`${API}/admin/finance/tuition-rates/${tuitionProgramme.id}`, {
        national_tuition_fee: Number(tuitionForm.national_tuition_fee),
        international_tuition_fee: Number(tuitionForm.international_tuition_fee)
      }, { headers })
      closeModal()
      setPageNotice('Tuition rates updated. Existing invoices were not changed.')
      await refetchTuition()
    } catch (requestError) {
      setModalError(requestMessage(requestError, 'Tuition rates could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  const openInvoiceForm = () => {
    clearMessages()
    setInvoiceForm({ ...EMPTY_INVOICE })
    setSelectedStudent(null)
    setStudentSearch('')
    setActiveModal('invoice')
  }

  const submitInvoice = async (event) => {
    event.preventDefault()
    if (!selectedStudent) {
      setModalError('Choose a student before issuing the invoice.')
      return
    }
    setSaving(true)
    setModalError('')
    try {
      await axios.post(`${API}/admin/finance/invoices`, {
        ...invoiceForm,
        student_id: selectedStudent.id,
        amount: Number(invoiceForm.amount),
        academic_term_id: Number(invoiceForm.academic_term_id),
        due_date: invoiceForm.due_date || null
      }, { headers })
      closeModal()
      setPageNotice('Invoice issued. The student account and fee history have been updated.')
      await refreshLedger()
    } catch (requestError) {
      setModalError(requestMessage(requestError, 'The invoice could not be issued.'))
    } finally {
      setSaving(false)
    }
  }

  const openInvoiceDetail = async (invoiceId) => {
    clearMessages()
    setSelectedInvoiceId(invoiceId)
    setInvoiceDetail(null)
    setDetailLoading(true)
    setPaymentForm({ amount: '', payment_method: 'bank_transfer', reference_code: '' })
    setPaymentConfirmed(false)
    setActiveModal('invoice-detail')
    try {
      const response = await axios.get(`${API}/admin/finance/invoices/${invoiceId}`, { headers })
      setInvoiceDetail(response.data.data)
    } catch (requestError) {
      setModalError(requestMessage(requestError, 'Invoice details could not be loaded.'))
    } finally {
      setDetailLoading(false)
    }
  }

  const submitPayment = async (event) => {
    event.preventDefault()
    if (!paymentConfirmed) {
      setModalError('Confirm that the funds have been received before recording the receipt.')
      return
    }
    setSaving(true)
    setModalError('')
    try {
      await axios.post(`${API}/admin/finance/invoices/${selectedInvoiceId}/payments`, {
        ...paymentForm,
        amount: Number(paymentForm.amount)
      }, { headers })
      setPaymentForm({ amount: '', payment_method: 'bank_transfer', reference_code: '' })
      setPaymentConfirmed(false)
      await Promise.all([
        refreshLedger(),
        axios.get(`${API}/admin/finance/invoices/${selectedInvoiceId}`, { headers }).then(response => {
          setInvoiceDetail(response.data.data)
        })
      ])
      setPageNotice('Receipt recorded and applied to the selected invoice.')
    } catch (requestError) {
      setModalError(requestMessage(requestError, 'The payment could not be recorded.'))
    } finally {
      setSaving(false)
    }
  }

  const retryCurrentView = () => {
    if (activeTab === 'ledger') {
      refreshLedger()
      refetchTerms()
    } else if (scheduleTab === 'tuition') refetchTuition()
    else if (scheduleTab === 'functional') refetchFunctionalFees()
    else Promise.all([refetchProgrammeFees(), refetchProgrammes()])
  }

  const invoiceError = invoicesError || overviewError || termsError
  const scheduleError = scheduleTab === 'tuition' ? tuitionError
    : scheduleTab === 'functional' ? functionalFeesError
      : programmeFeesError || programmesError
  const loadingSchedule = scheduleTab === 'tuition' ? loadingTuition
    : scheduleTab === 'functional' ? loadingFunctionalFees
      : loadingProgrammeFees || loadingProgrammes

  const modalTitle = activeModal === 'tuition'
    ? `Tuition rates · ${tuitionProgramme?.name || ''}`
    : activeModal === 'invoice'
      ? 'Issue a student invoice'
      : activeModal === 'invoice-detail'
        ? 'Invoice and receipt history'
        : `${editingId ? 'Edit' : 'Add'} ${feeType === 'functional' ? 'functional' : 'programme'} fee`

  return (
    <div className="scope-adminfees admin-layout">
      <AdminSidebar />
      <main className="admin-content admin-fees-content">
        <header className="fees-page-header">
          <div className="fees-page-heading">
            <p className="fees-eyebrow">Finance operations</p>
            <h1>Fees manager</h1>
            <p>Manage tuition and fee schedules, review student invoices, and record received payments.</p>
          </div>
          {activeTab === 'ledger' && (
            <button type="button" className="fees-primary-button" onClick={openInvoiceForm}>
              <Plus size={17} /> Issue invoice
            </button>
          )}
        </header>

        {pageNotice && (
          <div className="fees-feedback fees-feedback--success" role="status">
            <Check size={17} /><span>{pageNotice}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setPageNotice('')}><X size={15} /></button>
          </div>
        )}
        {pageError && (
          <div className="fees-feedback fees-feedback--error" role="alert">
            <CircleAlert size={17} /><span>{pageError}</span>
            <button type="button" onClick={() => setPageError('')}>Dismiss</button>
          </div>
        )}

        <nav className="fees-main-tabs" aria-label="Fees manager sections">
          <button type="button" className={activeTab === 'ledger' ? 'is-active' : ''} onClick={() => setActiveTab('ledger')}>
            <Receipt size={16} /> Student ledger
          </button>
          <button type="button" className={activeTab === 'schedule' ? 'is-active' : ''} onClick={() => setActiveTab('schedule')}>
            <BadgeDollarSign size={16} /> Fee schedule
          </button>
        </nav>

        {activeTab === 'ledger' ? (
          <div className="fees-ledger-view">
            {invoiceError && (
              <div className="fees-inline-error" role="alert">
                <CircleAlert size={17} />
                <span>Financial records could not be fully loaded. Check your connection and retry.</span>
                <button type="button" onClick={retryCurrentView}>Retry</button>
              </div>
            )}

            <section className="fees-currency-grid" aria-label="Financial totals by currency">
              {loadingOverview ? (
                <div className="fees-loading">Loading current financial totals…</div>
              ) : paymentSummary.length ? paymentSummary.map(summary => (
                <article className="fees-currency-card" key={summary.currency}>
                  <div className="fees-currency-card-heading">
                    <span className="fees-currency-icon"><Banknote size={18} /></span>
                    <div><span>{summary.currency} ledger</span><strong>{Number(summary.open_invoice_count || 0).toLocaleString()} open invoices</strong></div>
                  </div>
                  <div className="fees-currency-numbers">
                    <div><span>Outstanding</span><strong>{formatMoney(summary.currency, summary.outstanding)}</strong></div>
                    <div><span>Received</span><strong>{formatMoney(summary.currency, summary.received)}</strong></div>
                    <div><span>Invoiced</span><strong>{formatMoney(summary.currency, summary.billed)}</strong></div>
                  </div>
                  <p><ArrowUpRight size={14} /> {formatMoney(summary.currency, summary.received_last_30_days)} received in the last 30 days</p>
                </article>
              )) : (
                <div className="fees-empty-summary">
                  <Receipt size={20} />
                  <span>No financial records have been recorded yet.</span>
                </div>
              )}
            </section>

            <section className="fees-ledger-card">
              <div className="fees-section-heading">
                <div>
                  <p className="fees-eyebrow">Student accounts</p>
                  <h2>Invoice ledger</h2>
                  <p>Balances use payments allocated to each invoice. Payment records are retained in the receipt history.</p>
                </div>
                <span className="fees-result-count">{Number(pagination.total || 0).toLocaleString()} invoices</span>
              </div>

              <div className="fees-ledger-filters">
                <label className="fees-search">
                  <Search size={16} aria-hidden="true" />
                  <span className="fees-visually-hidden">Search invoices</span>
                  <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Student, programme, or email" />
                </label>
                <label>
                  <span className="fees-visually-hidden">Filter by payment status</span>
                  <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                    <option value="all">All statuses</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partially paid</option>
                    <option value="paid">Paid</option>
                    <option value="void">Void</option>
                  </select>
                </label>
                <label>
                  <span className="fees-visually-hidden">Filter by currency</span>
                  <select value={currencyFilter} onChange={event => setCurrencyFilter(event.target.value)}>
                    <option value="all">All currencies</option>
                    <option value="UGX">UGX</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
                <label>
                  <span className="fees-visually-hidden">Filter by academic term</span>
                  <select value={termFilter} onChange={event => setTermFilter(event.target.value)} disabled={loadingTerms}>
                    <option value="all">All academic terms</option>
                    {terms.map(term => <option key={term.id} value={term.id}>{term.academic_year_name} · {term.name}</option>)}
                  </select>
                </label>
                <button type="button" className="fees-refresh-button" onClick={refreshLedger} aria-label="Refresh financial records">
                  <History size={16} /> Refresh
                </button>
              </div>

              {loadingInvoices ? (
                <div className="fees-loading">Loading invoice records…</div>
              ) : invoicesError ? null : invoices.length ? (
                <>
                  <div className="fees-table-scroll">
                    <table className="fees-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Invoice</th>
                          <th>Academic term</th>
                          <th>Amount</th>
                          <th>Paid</th>
                          <th>Balance</th>
                          <th>Status</th>
                          <th><span className="fees-visually-hidden">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map(invoice => (
                          <tr key={invoice.id}>
                            <td>
                              <div className="fees-student-identity">
                                <span className="fees-student-avatar">{getName(invoice).split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'ST'}</span>
                                <span><strong>{getName(invoice)}</strong><small>{invoice.student_number} · {invoice.programme_name}</small></span>
                              </div>
                            </td>
                            <td><strong>{invoice.description}</strong><small className="fees-cell-note">{invoice.fee_type} · {formatDate(invoice.created_at)}</small></td>
                            <td>{invoice.term_name || 'General term'}<small className="fees-cell-note">Due {formatDate(invoice.due_date)}</small></td>
                            <td>{formatMoney(invoice.currency, invoice.amount)}</td>
                            <td className="fees-paid-amount">{formatMoney(invoice.currency, invoice.amount_paid)}</td>
                            <td className={Number(invoice.balance) > 0 ? 'fees-balance-due' : 'fees-paid-amount'}>{formatMoney(invoice.currency, invoice.balance)}</td>
                            <td><StatusPill status={invoice.ledger_status} /></td>
                            <td><button type="button" className="fees-row-action" onClick={() => openInvoiceDetail(invoice.id)}>View details <ChevronRight size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="fees-pagination">
                    <span>Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span>
                    <div>
                      <button type="button" disabled={!pagination.hasPreviousPage || fetchingInvoices} onClick={() => setPage(current => Math.max(1, current - 1))}><ChevronLeft size={16} /> Previous</button>
                      <button type="button" disabled={!pagination.hasNextPage || fetchingInvoices} onClick={() => setPage(current => current + 1)}>Next <ChevronRight size={16} /></button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="fees-empty-state">
                  <span><Receipt size={22} /></span>
                  <h3>{search || statusFilter !== 'all' || currencyFilter !== 'all' || termFilter !== 'all' ? 'No matching invoices' : 'No invoices recorded yet'}</h3>
                  <p>{search || statusFilter !== 'all' || currencyFilter !== 'all' || termFilter !== 'all' ? 'Adjust the search or filters to see other financial records.' : 'Issue an invoice to a student to begin managing their account here.'}</p>
                  {!search && statusFilter === 'all' && currencyFilter === 'all' && termFilter === 'all' && <button type="button" className="fees-secondary-button" onClick={openInvoiceForm}><Plus size={15} /> Issue invoice</button>}
                </div>
              )}
            </section>

            <section className="fees-recent-card">
              <div className="fees-section-heading fees-section-heading--compact">
                <div><p className="fees-eyebrow">Receipts</p><h2>Recent payments</h2></div>
                <span className="fees-result-count">{overview.recentPayments.length} recent</span>
              </div>
              {overview.recentPayments.length ? (
                <div className="fees-receipt-list">
                  {overview.recentPayments.map(payment => (
                    <article key={payment.id} className="fees-receipt-row">
                      <span className="fees-receipt-icon"><CreditCard size={16} /></span>
                      <span className="fees-receipt-person"><strong>{getName(payment)}</strong><small>{payment.student_number} · {payment.payment_method?.replace(/_/g, ' ') || 'Payment'} · {payment.reference_code || 'No reference'}</small></span>
                      <span className="fees-receipt-amount">{formatMoney(payment.currency, payment.amount)}</span>
                      <time>{formatDate(payment.payment_date)}</time>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="fees-receipt-empty">No payment receipts have been recorded yet.</p>
              )}
            </section>
          </div>
        ) : (
          <section className="fees-schedule-card">
            <div className="fees-section-heading">
              <div>
                <p className="fees-eyebrow">Pricing configuration</p>
                <h2>Fee schedule</h2>
                <p>Changes here apply to future fee assessments. Existing student invoices are not modified.</p>
              </div>
            </div>
            <nav className="fees-schedule-tabs" aria-label="Fee schedule categories">
              <button type="button" className={scheduleTab === 'tuition' ? 'is-active' : ''} onClick={() => setScheduleTab('tuition')}><GraduationCap size={16} /> Tuition</button>
              <button type="button" className={scheduleTab === 'functional' ? 'is-active' : ''} onClick={() => setScheduleTab('functional')}><ShieldCheck size={16} /> Functional fees</button>
              <button type="button" className={scheduleTab === 'programme' ? 'is-active' : ''} onClick={() => setScheduleTab('programme')}><BookOpen size={16} /> Programme fees</button>
              {scheduleTab !== 'tuition' && (
                <button type="button" className="fees-primary-button fees-add-fee-button" onClick={() => openFeeForm(scheduleTab)}>
                  <Plus size={16} /> Add fee
                </button>
              )}
            </nav>

            {scheduleError && (
              <div className="fees-inline-error" role="alert">
                <CircleAlert size={17} /><span>Fee schedule could not be loaded.</span>
                <button type="button" onClick={retryCurrentView}>Retry</button>
              </div>
            )}

            {loadingSchedule ? (
              <div className="fees-loading">Loading fee schedule…</div>
            ) : scheduleError ? null : scheduleTab === 'tuition' ? (
              tuitionRates.length ? (
                <div className="fees-table-scroll">
                  <table className="fees-table fees-schedule-table">
                    <thead><tr><th>Programme</th><th>Level</th><th>National tuition · UGX</th><th>International tuition · USD</th><th>Programme</th><th><span className="fees-visually-hidden">Actions</span></th></tr></thead>
                    <tbody>
                      {tuitionRates.map(programme => (
                        <tr key={programme.id}>
                          <td><strong>{programme.name}</strong><small className="fees-cell-note">{programme.type?.replace(/_/g, ' ')}</small></td>
                          <td>{programme.level || 'Not specified'}</td>
                          <td>{programme.national_tuition_fee == null && programme.tuition_fee == null ? 'Not set' : formatMoney('UGX', programme.national_tuition_fee ?? programme.tuition_fee)}</td>
                          <td>{programme.international_tuition_fee == null ? 'Not set' : formatMoney('USD', programme.international_tuition_fee)}</td>
                          <td><StatusPill status={programme.active ? 'active' : 'inactive'} /></td>
                          <td><button type="button" className="fees-row-action" onClick={() => openTuitionForm(programme)}>Edit rates <ChevronRight size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="fees-empty-state"><span><GraduationCap size={22} /></span><h3>No programmes found</h3><p>Programme tuition rates will appear here when programmes are configured.</p></div>
            ) : scheduleTab === 'functional' ? (
              functionalFees.length ? (
                <div className="fees-table-scroll">
                  <table className="fees-table fees-schedule-table">
                    <thead><tr><th>Fee</th><th>National · UGX</th><th>International · USD</th><th>Required</th><th>Status</th><th><span className="fees-visually-hidden">Actions</span></th></tr></thead>
                    <tbody>{functionalFees.map(fee => (
                      <tr key={fee.id}>
                        <td><strong>{fee.fee_name}</strong><small className="fees-cell-note">{fee.description || 'No description'}</small></td>
                        <td>{formatMoney('UGX', fee.national_amount)}</td>
                        <td>{formatMoney('USD', fee.international_amount)}</td>
                        <td>{fee.is_mandatory ? 'Mandatory' : 'Optional'}</td>
                        <td><StatusPill status={fee.active ? 'active' : 'inactive'} /></td>
                        <td className="fees-action-cell">
                          <button type="button" className="fees-row-action" onClick={() => openFeeForm('functional', fee)}>Edit <ChevronRight size={14} /></button>
                          <button type="button" className="fees-link-button" onClick={() => setFeeActive(fee, 'functional')}>{fee.active ? 'Deactivate' : 'Reactivate'}</button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <div className="fees-empty-state"><span><ShieldCheck size={22} /></span><h3>No functional fees configured</h3><p>Add a functional fee to make it available for future fee assessments.</p><button type="button" className="fees-secondary-button" onClick={() => openFeeForm('functional')}><Plus size={15} /> Add functional fee</button></div>
            ) : (
              programmeFees.length ? (
                <div className="fees-table-scroll">
                  <table className="fees-table fees-schedule-table">
                    <thead><tr><th>Programme</th><th>Fee</th><th>National · UGX</th><th>International · USD</th><th>Required</th><th>Status</th><th><span className="fees-visually-hidden">Actions</span></th></tr></thead>
                    <tbody>{programmeFees.map(fee => (
                      <tr key={fee.id}>
                        <td>{fee.programme_name || 'Programme unavailable'}</td>
                        <td><strong>{fee.fee_name}</strong><small className="fees-cell-note">{fee.description || 'No description'}</small></td>
                        <td>{formatMoney('UGX', fee.national_amount)}</td>
                        <td>{formatMoney('USD', fee.international_amount)}</td>
                        <td>{fee.is_mandatory ? 'Mandatory' : 'Optional'}</td>
                        <td><StatusPill status={fee.active ? 'active' : 'inactive'} /></td>
                        <td className="fees-action-cell">
                          <button type="button" className="fees-row-action" onClick={() => openFeeForm('programme', fee)}>Edit <ChevronRight size={14} /></button>
                          <button type="button" className="fees-link-button" onClick={() => setFeeActive(fee, 'programme')}>{fee.active ? 'Deactivate' : 'Reactivate'}</button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <div className="fees-empty-state"><span><BookOpen size={22} /></span><h3>No programme fees configured</h3><p>Add a programme fee to include it in future fee assessments.</p><button type="button" className="fees-secondary-button" onClick={() => openFeeForm('programme')}><Plus size={15} /> Add programme fee</button></div>
            )}
          </section>
        )}
      </main>

      {activeModal && (
        <div className="fees-modal-backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget && !saving) closeModal()
        }}>
          <section className={`fees-modal ${activeModal === 'invoice-detail' ? 'fees-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="fees-modal-title">
            <button type="button" className="fees-modal-close" onClick={closeModal} disabled={saving} aria-label="Close dialog"><X size={18} /></button>
            <p className="fees-eyebrow">Finance operations</p>
            <h2 id="fees-modal-title">{modalTitle}</h2>

            {activeModal === 'fee' && (
              <form className="fees-form" onSubmit={saveFee}>
                {feeType === 'programme' && (
                  <label><span>Programme</span>
                    <select value={feeForm.programme_id} onChange={event => setFeeForm(previous => ({ ...previous, programme_id: event.target.value }))} required disabled={loadingProgrammes}>
                      <option value="">{loadingProgrammes ? 'Loading programmes…' : 'Select a programme'}</option>
                      {programmes.map(programme => <option key={programme.id} value={programme.id}>{programme.name}</option>)}
                    </select>
                  </label>
                )}
                <label><span>Fee name</span><input value={feeForm.fee_name} onChange={event => setFeeForm(previous => ({ ...previous, fee_name: event.target.value }))} required maxLength={255} /></label>
                <div className="fees-form-grid">
                  <label><span>National amount · UGX</span><input type="number" min="0" step="0.01" value={feeForm.national_amount} onChange={event => setFeeForm(previous => ({ ...previous, national_amount: event.target.value }))} required /></label>
                  <label><span>International amount · USD</span><input type="number" min="0" step="0.01" value={feeForm.international_amount} onChange={event => setFeeForm(previous => ({ ...previous, international_amount: event.target.value }))} required /></label>
                </div>
                <label><span>Description <small>(optional)</small></span><textarea rows="3" maxLength={2000} value={feeForm.description} onChange={event => setFeeForm(previous => ({ ...previous, description: event.target.value }))} /></label>
                <label className="fees-checkbox-label"><input type="checkbox" checked={feeForm.is_mandatory} onChange={event => setFeeForm(previous => ({ ...previous, is_mandatory: event.target.checked }))} /><span>Mandatory for applicable students</span></label>
                {modalError && <div className="fees-feedback fees-feedback--error" role="alert"><CircleAlert size={16} />{modalError}</div>}
                <div className="fees-modal-note"><ShieldCheck size={15} /> Updating a fee schedule never edits invoices already issued.</div>
                <div className="fees-modal-actions"><button type="button" className="fees-secondary-button" onClick={closeModal} disabled={saving}>Cancel</button><button type="submit" className="fees-primary-button" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add fee'}</button></div>
              </form>
            )}

            {activeModal === 'tuition' && (
              <form className="fees-form" onSubmit={saveTuition}>
                <p className="fees-modal-description">These rates are used for future student fee assessments. Existing invoices remain unchanged. Enter 0 when tuition is not charged.</p>
                <label><span>National tuition · UGX</span><input type="number" min="0" step="0.01" value={tuitionForm.national_tuition_fee} onChange={event => setTuitionForm(previous => ({ ...previous, national_tuition_fee: event.target.value }))} required /></label>
                <label><span>International tuition · USD</span><input type="number" min="0" step="0.01" value={tuitionForm.international_tuition_fee} onChange={event => setTuitionForm(previous => ({ ...previous, international_tuition_fee: event.target.value }))} required /></label>
                {modalError && <div className="fees-feedback fees-feedback--error" role="alert"><CircleAlert size={16} />{modalError}</div>}
                <div className="fees-modal-actions"><button type="button" className="fees-secondary-button" onClick={closeModal} disabled={saving}>Cancel</button><button type="submit" className="fees-primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save tuition rates'}</button></div>
              </form>
            )}

            {activeModal === 'invoice' && (
              <form className="fees-form" onSubmit={submitInvoice}>
                <div className="fees-student-picker">
                  <label><span>Find student</span><div className="fees-search"><Search size={16} /><input value={selectedStudent ? `${getName(selectedStudent)} · ${selectedStudent.student_number}` : studentSearch} onChange={event => {
                    setSelectedStudent(null)
                    setStudentSearch(event.target.value)
                  }} placeholder="Search name, student number, or email" /></div></label>
                  {!selectedStudent && studentSearch.trim().length >= 2 && (
                    <div className="fees-student-options">
                      {searchingStudents ? <span className="fees-option-message">Searching students…</span>
                        : studentOptions.length ? studentOptions.map(student => (
                          <button key={student.id} type="button" onClick={() => {
                            setSelectedStudent(student)
                            setStudentSearch('')
                          }}>
                            <UserRound size={15} /><span><strong>{getName(student)}</strong><small>{student.student_number} · {student.programme_name} · {student.email}</small></span>
                          </button>
                        )) : <span className="fees-option-message">No students match that search.</span>}
                    </div>
                  )}
                  {selectedStudent && <div className="fees-selected-student"><Users size={15} /><span><strong>{getName(selectedStudent)}</strong><small>{selectedStudent.student_number} · {selectedStudent.programme_name}</small></span><button type="button" onClick={() => setSelectedStudent(null)}>Change</button></div>}
                </div>
                <label><span>Academic term</span><select value={invoiceForm.academic_term_id} onChange={event => setInvoiceForm(previous => ({ ...previous, academic_term_id: event.target.value }))} required disabled={loadingTerms}><option value="">{loadingTerms ? 'Loading academic terms…' : 'Select a term'}</option>{terms.map(term => <option key={term.id} value={term.id}>{term.academic_year_name} · {term.name}</option>)}</select></label>
                <div className="fees-form-grid">
                  <label><span>Fee type</span><select value={invoiceForm.fee_type} onChange={event => setInvoiceForm(previous => ({ ...previous, fee_type: event.target.value }))}><option value="tuition">Tuition</option><option value="functional">Functional</option><option value="programme">Programme</option><option value="late_registration">Late registration</option><option value="other">Other</option></select></label>
                  <label><span>Currency</span><select value={invoiceForm.currency} onChange={event => setInvoiceForm(previous => ({ ...previous, currency: event.target.value }))}><option value="UGX">UGX · Uganda shillings</option><option value="USD">USD · US dollars</option></select></label>
                </div>
                <div className="fees-form-grid">
                  <label><span>Amount</span><input type="number" min="0.01" step="0.01" value={invoiceForm.amount} onChange={event => setInvoiceForm(previous => ({ ...previous, amount: event.target.value }))} required /></label>
                  <label><span>Due date <small>(optional)</small></span><input type="date" value={invoiceForm.due_date} onChange={event => setInvoiceForm(previous => ({ ...previous, due_date: event.target.value }))} /></label>
                </div>
                <label><span>Invoice description</span><textarea rows="2" maxLength={2000} value={invoiceForm.description} onChange={event => setInvoiceForm(previous => ({ ...previous, description: event.target.value }))} required /></label>
                <div className="fees-modal-note"><Receipt size={15} /> This issues one new invoice only; no existing charges or invoices are changed.</div>
                {modalError && <div className="fees-feedback fees-feedback--error" role="alert"><CircleAlert size={16} />{modalError}</div>}
                <div className="fees-modal-actions"><button type="button" className="fees-secondary-button" onClick={closeModal} disabled={saving}>Cancel</button><button type="submit" className="fees-primary-button" disabled={saving || loadingTerms}>{saving ? 'Issuing…' : 'Issue invoice'}</button></div>
              </form>
            )}

            {activeModal === 'invoice-detail' && (
              detailLoading ? <div className="fees-loading">Loading invoice and receipt history…</div>
                : invoiceDetail ? (
                  <div className="fees-invoice-detail">
                    <div className="fees-invoice-summary">
                      <div><span>Student</span><strong>{getName(invoiceDetail.invoice)}</strong><small>{invoiceDetail.invoice.student_number} · {invoiceDetail.invoice.programme_name}</small></div>
                      <div><span>Invoice</span><strong>{invoiceDetail.invoice.description}</strong><small>{invoiceDetail.invoice.term_name || 'General term'} · Issued {formatDate(invoiceDetail.invoice.created_at)}</small></div>
                      <div><span>Amount due</span><strong>{formatMoney(invoiceDetail.invoice.currency, invoiceDetail.invoice.amount)}</strong></div>
                      <div><span>Balance</span><strong className={Number(invoiceDetail.invoice.balance) > 0 ? 'fees-balance-due' : 'fees-paid-amount'}>{formatMoney(invoiceDetail.invoice.currency, invoiceDetail.invoice.balance)}</strong><StatusPill status={invoiceDetail.invoice.ledger_status} /></div>
                    </div>
                    <section className="fees-detail-section">
                      <h3><History size={16} /> Payment history</h3>
                      {invoiceDetail.payments.length ? (
                        <div className="fees-payment-history">
                          {invoiceDetail.payments.map(payment => (
                            <div key={payment.id} className="fees-history-row">
                              <span><strong>{formatMoney(payment.currency, payment.amount_applied)}</strong><small>{payment.payment_method?.replace(/_/g, ' ') || 'Payment'} · {payment.reference_code || 'No reference'}</small></span>
                              <time>{formatDate(payment.payment_date)}</time>
                            </div>
                          ))}
                        </div>
                      ) : <p className="fees-history-empty">No payments have been applied to this invoice.</p>}
                    </section>
                    {Number(invoiceDetail.invoice.balance) > 0 && invoiceDetail.invoice.ledger_status !== 'void' && (
                      <form className="fees-payment-form" onSubmit={submitPayment}>
                        <h3><CreditCard size={16} /> Record received payment</h3>
                        <div className="fees-form-grid fees-form-grid--payment">
                          <label><span>Amount · {invoiceDetail.invoice.currency}</span><input type="number" min="0.01" max={invoiceDetail.invoice.balance} step="0.01" value={paymentForm.amount} onChange={event => setPaymentForm(previous => ({ ...previous, amount: event.target.value }))} required /></label>
                          <label><span>Payment method</span><select value={paymentForm.payment_method} onChange={event => setPaymentForm(previous => ({ ...previous, payment_method: event.target.value }))}><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="cash">Cash</option><option value="card">Card</option><option value="other">Other</option></select></label>
                        </div>
                        <label><span>Receipt or transaction reference</span><input value={paymentForm.reference_code} maxLength={100} onChange={event => setPaymentForm(previous => ({ ...previous, reference_code: event.target.value }))} required /></label>
                        <label className="fees-checkbox-label fees-confirm-label"><input type="checkbox" checked={paymentConfirmed} onChange={event => setPaymentConfirmed(event.target.checked)} /><span>I confirm these funds have been received. The receipt will be retained in the student ledger.</span></label>
                        {modalError && <div className="fees-feedback fees-feedback--error" role="alert"><CircleAlert size={16} />{modalError}</div>}
                        <button type="submit" className="fees-primary-button" disabled={saving || !paymentConfirmed}>{saving ? 'Recording…' : 'Record payment'}</button>
                      </form>
                    )}
                    {invoiceDetail.invoice.ledger_status === 'void' && <div className="fees-modal-note"><CircleAlert size={15} /> This invoice is void and cannot accept payments.</div>}
                    {modalError && (invoiceDetail.invoice.ledger_status === 'paid' || invoiceDetail.invoice.ledger_status === 'void') && <div className="fees-feedback fees-feedback--error" role="alert"><CircleAlert size={16} />{modalError}</div>}
                  </div>
                ) : <div className="fees-inline-error" role="alert"><CircleAlert size={16} /><span>Invoice details are unavailable.</span></div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
