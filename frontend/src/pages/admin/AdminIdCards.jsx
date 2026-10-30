import { useState, useEffect, useMemo, useRef } from 'react'
import {
  CreditCard, RefreshCw, Printer, ShieldCheck, Search, Filter,
  CheckCircle2, XCircle, AlertCircle, Clock, UserCheck, Eye,
  Lock, Key, Users, ChevronRight, ArrowUpDown, Download, CheckSquare,
  Square, Calendar, Building, Award, ExternalLink
} from 'lucide-react'
import api from '../../services/api'
import AdminSidebar from '../../components/AdminSidebar'
import IdCard3D from '../../components/IdCard3D'
import './AdminIdCards.css'

export default function AdminIdCards() {
  const [cards, setCards] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState('registry') // 'registry' | 'batch_print' | 'scanner' | 'delegations' | 'logs'

  // Filters & Search
  const [typeFilter, setTypeFilter] = useState('all')
  const [printFilter, setPrintFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Batch Print Selection
  const [selectedCardIds, setSelectedCardIds] = useState([])

  // Modal 3D Preview
  const [previewCard, setPreviewCard] = useState(null)

  // Scanner Terminal State
  const [scannerInput, setScannerInput] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState('')
  const [admitting, setAdmitting] = useState(false)
  const [admitMessage, setAdmitMessage] = useState('')

  // Delegations State
  const [delegations, setDelegations] = useState([])
  const [delegationsLoading, setDelegationsLoading] = useState(false)
  const [showDelegationModal, setShowDelegationModal] = useState(false)
  const [delegationForm, setDelegationForm] = useState({
    account_email: '',
    account_name: '',
    user_type: 'staff',
    valid_until: '',
    purpose: 'Exam hall entry & facility access verification'
  })
  const [delegationSubmitting, setDelegationSubmitting] = useState(false)
  const [delegationMessage, setDelegationMessage] = useState('')

  // Fetch cards and stats
  const fetchCards = async () => {
    try {
      setLoading(true)
      const res = await api.get('/id-cards', {
        params: {
          cardholder_type: typeFilter,
          print_status: printFilter,
          search: searchQuery,
          limit: 100
        }
      })
      if (res.data?.success) {
        setCards(res.data.data || [])
        setStats(res.data.stats || null)
      }
    } catch (err) {
      console.error('Failed to load ID cards:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch delegations
  const fetchDelegations = async () => {
    try {
      setDelegationsLoading(true)
      const res = await api.get('/id-cards/delegations')
      if (res.data?.success) {
        setDelegations(res.data.data || [])
      }
    } catch (err) {
      console.error('Failed to load delegations:', err)
    } finally {
      setDelegationsLoading(false)
    }
  }

  useEffect(() => {
    fetchCards()
  }, [typeFilter, printFilter])

  useEffect(() => {
    if (activeTab === 'delegations') {
      fetchDelegations()
    }
  }, [activeTab])

  // Sync Cards with System Records
  const handleSync = async () => {
    try {
      setSyncing(true)
      const res = await api.post('/id-cards/sync')
      if (res.data?.success) {
        alert(res.data.message || 'ID Cards successfully synchronized!')
        fetchCards()
      }
    } catch (err) {
      alert('Sync failed: ' + (err.response?.data?.message || err.message))
    } finally {
      setSyncing(false)
    }
  }

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchCards()
  }

  // Toggle Card Selection for Batch Print
  const toggleSelectCard = (id) => {
    setSelectedCardIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedCardIds.length === cards.length) {
      setSelectedCardIds([])
    } else {
      setSelectedCardIds(cards.map(c => c.id))
    }
  }

  // Execute Batch Print
  const handleBatchPrint = async () => {
    if (selectedCardIds.length === 0) {
      alert('Please select at least one card to print.')
      return
    }

    try {
      // Mark as printed on server
      await api.post('/id-cards/batch-print', { card_ids: selectedCardIds })
      // Trigger standard print dialog
      window.print()
      fetchCards()
      setSelectedCardIds([])
    } catch (err) {
      console.error('Batch print failed', err)
      window.print()
    }
  }

  // Toggle status
  const handleStatusChange = async (cardId, newStatus) => {
    try {
      const res = await api.patch(`/id-cards/${cardId}/status`, { status: newStatus })
      if (res.data?.success) {
        setCards(prev => prev.map(c => (c.id === cardId ? { ...c, status: newStatus } : c)))
      }
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.message || err.message))
    }
  }

  // Scanner Lookup
  const handleScanSubmit = async (e) => {
    e?.preventDefault()
    if (!scannerInput.trim()) return

    setScanLoading(true)
    setScanError('')
    setScanResult(null)
    setAdmitMessage('')

    try {
      // Strip URL if user pasted full verification link
      let token = scannerInput.trim()
      if (token.includes('/verify/id/')) {
        token = token.split('/verify/id/').pop()
      }

      const res = await api.get(`/id-cards/verify/${token}`)
      if (res.data?.success) {
        setScanResult(res.data)
      } else {
        setScanError(res.data?.message || 'Verification lookup failed.')
      }
    } catch (err) {
      setScanError(err.response?.data?.message || 'Invalid card or token not found.')
    } finally {
      setScanLoading(false)
    }
  }

  // 1-Click Exam Admittance
  const handleAdmitCardholder = async () => {
    if (!scanResult?.card?.qr_token) return
    setAdmitting(true)
    setAdmitMessage('')
    try {
      const res = await api.post(`/id-cards/verify/${scanResult.card.qr_token}/admit`, {
        action_type: 'admitted_exam',
        room_or_hall: 'Main Examination Hall',
        notes: 'Admitted via Admin Web Scanner Terminal'
      })
      if (res.data?.success) {
        setAdmitMessage(`Admitted successfully! Recorded at ${new Date().toLocaleTimeString()}`)
      }
    } catch (err) {
      setAdmitMessage('Error recording admittance: ' + (err.response?.data?.message || err.message))
    } finally {
      setAdmitting(false)
    }
  }

  // Create Verifier Delegation
  const handleCreateDelegation = async (e) => {
    e.preventDefault()
    setDelegationSubmitting(true)
    setDelegationMessage('')
    try {
      const res = await api.post('/id-cards/delegations', delegationForm)
      if (res.data?.success) {
        setDelegationMessage('Verification privileges granted successfully.')
        setShowDelegationModal(false)
        setDelegationForm({
          account_email: '',
          account_name: '',
          user_type: 'staff',
          valid_until: '',
          purpose: 'Exam hall entry & facility access verification'
        })
        fetchDelegations()
      }
    } catch (err) {
      setDelegationMessage(err.response?.data?.message || 'Failed to grant delegation.')
    } finally {
      setDelegationSubmitting(false)
    }
  }

  // Revoke Delegation
  const handleRevokeDelegation = async (delId) => {
    if (!confirm('Are you sure you want to revoke verification privileges for this account?')) return
    try {
      const res = await api.patch(`/id-cards/delegations/${delId}/revoke`, {
        reason: 'Revoked by system administrator'
      })
      if (res.data?.success) {
        fetchDelegations()
      }
    } catch (err) {
      alert('Failed to revoke delegation: ' + (err.response?.data?.message || err.message))
    }
  }

  // Filtered Cards to print
  const printableCards = useMemo(() => {
    if (selectedCardIds.length === 0) return cards
    return cards.filter(c => selectedCardIds.includes(c.id))
  }, [cards, selectedCardIds])

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">
        {/* Page Header */}
        <header className="page-header">
          <div className="header-info">
            <h1 className="page-title">Institutional ID Cards Management</h1>
            <p className="page-subtitle">
              CR80 Standard PVC Production, Digital Credentialing &amp; Privileged Verifier System
            </p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={handleSync}
              disabled={syncing}
              title="Synchronize and issue new cards from admitted students and active staff"
            >
              <RefreshCw size={16} className={syncing ? 'spin-icon' : ''} />
              <span>{syncing ? 'Syncing Records...' : 'Sync Records'}</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setActiveTab('batch_print')}
            >
              <Printer size={16} />
              <span>Batch Printing Queue</span>
            </button>
          </div>
        </header>

        {/* Quick KPI Metric Strip */}
        <div className="id-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">TOTAL ISSUED CARDS</span>
            <span className="metric-value">{stats?.total_cards || cards.length}</span>
            <span className="metric-footnote">Active in university registry</span>
          </div>
          <div className="metric-box highlight-amber">
            <span className="metric-label">QUEUED FOR PRINTING</span>
            <span className="metric-value">{stats?.queued_prints || 0}</span>
            <span className="metric-footnote">CR80 PVC cards pending issue</span>
          </div>
          <div className="metric-box highlight-blue">
            <span className="metric-label">ENROLLED STUDENTS</span>
            <span className="metric-value">{stats?.students_count || 0}</span>
            <span className="metric-footnote">With verified passport photos</span>
          </div>
          <div className="metric-box highlight-emerald">
            <span className="metric-label">FACULTY &amp; STAFF</span>
            <span className="metric-value">
              {Number(stats?.lecturers_count || 0) + Number(stats?.admin_count || 0) + Number(stats?.support_count || 0)}
            </span>
            <span className="metric-footnote">Lecturers, Admin &amp; Support</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'registry' ? 'active' : ''}`}
            onClick={() => setActiveTab('registry')}
          >
            <CreditCard size={16} />
            <span>Card Registry</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'batch_print' ? 'active' : ''}`}
            onClick={() => setActiveTab('batch_print')}
          >
            <Printer size={16} />
            <span>Batch CR80 Printing</span>
            {Number(stats?.queued_prints || 0) > 0 && (
              <span className="tab-badge">{stats.queued_prints}</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => setActiveTab('scanner')}
          >
            <ShieldCheck size={16} />
            <span>Web Scanner &amp; Exam Admittance</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'delegations' ? 'active' : ''}`}
            onClick={() => setActiveTab('delegations')}
          >
            <UserCheck size={16} />
            <span>Verifier Privilege Delegations</span>
          </button>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            TAB 1: CARD REGISTRY
            ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'registry' && (
          <div className="tab-pane-content">
            {/* Filter Bar */}
            <div className="registry-filter-bar">
              <form onSubmit={handleSearchSubmit} className="search-form">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name, student ID, card number, or programme..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="btn btn-secondary btn-sm">Filter</button>
              </form>

              <div className="filter-selects">
                <div className="select-wrap">
                  <label>Cardholder:</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="filter-dropdown"
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Students</option>
                    <option value="lecturer">Lecturers</option>
                    <option value="administrative">Administrative</option>
                    <option value="support_staff">Support Staff</option>
                  </select>
                </div>

                <div className="select-wrap">
                  <label>Print Status:</label>
                  <select
                    value={printFilter}
                    onChange={(e) => setPrintFilter(e.target.value)}
                    className="filter-dropdown"
                  >
                    <option value="all">All Print Status</option>
                    <option value="queued">Queued</option>
                    <option value="printed">Printed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Registry Table */}
            <div className="table-responsive">
              <table className="id-registry-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedCardIds.length > 0 && selectedCardIds.length === cards.length}
                        onChange={toggleSelectAll}
                        title="Select All"
                      />
                    </th>
                    <th>CARDHOLDER</th>
                    <th>IDENTIFIER</th>
                    <th>CARD NUMBER</th>
                    <th>ROLE &amp; DEPARTMENT</th>
                    <th>STATUS</th>
                    <th>PRINT STATUS</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="table-loading">Loading institutional ID cards...</td>
                    </tr>
                  ) : cards.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="table-empty">
                        No ID cards match the current search or filters. Click &quot;Sync Records&quot; to auto-issue cards for students and staff.
                      </td>
                    </tr>
                  ) : (
                    cards.map((card) => {
                      const isSelected = selectedCardIds.includes(card.id)
                      return (
                        <tr key={card.id} className={isSelected ? 'row-selected' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCard(card.id)}
                            />
                          </td>
                          <td>
                            <div className="cardholder-cell">
                              {card.photo_url ? (
                                <img
                                  src={card.photo_url}
                                  alt={card.cardholder_name}
                                  className="cell-avatar"
                                  crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="cell-avatar placeholder">
                                  {card.cardholder_name?.charAt(0) || 'M'}
                                </div>
                              )}
                              <div className="cell-names">
                                <span className="cell-primary-name">{card.cardholder_name}</span>
                                <span className="cell-secondary-text">{card.campus_name || 'Main Campus'}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="mono-badge">{card.identifier_number}</span>
                          </td>
                          <td>
                            <span className="mono-code">{card.card_number}</span>
                          </td>
                          <td>
                            <div className="role-cell">
                              <span className={`role-pill role-${card.cardholder_type}`}>
                                {card.cardholder_type?.toUpperCase()}
                              </span>
                              <span className="department-cell-text">{card.department_or_programme}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill status-${card.status}`}>
                              {card.status?.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span className={`print-pill print-${card.print_status}`}>
                              {card.print_status === 'printed' ? 'Printed' : 'Queued'}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions-cell">
                              <button
                                className="action-icon-btn"
                                onClick={() => setPreviewCard(card)}
                                title="Interactive 3D Card Preview & 360° Animation"
                              >
                                <Eye size={15} />
                              </button>
                              <select
                                value={card.status}
                                onChange={(e) => handleStatusChange(card.id, e.target.value)}
                                className="status-dropdown-mini"
                                title="Change Card Status"
                              >
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="revoked">Revoked</option>
                                <option value="lost">Lost</option>
                              </select>
                              <a
                                href={`/verify/id/${card.qr_token}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-icon-btn"
                                title="Open Live Verification Gateway"
                              >
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            TAB 2: BATCH CR80 PLASTIC PRINTING
            ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'batch_print' && (
          <div className="tab-pane-content batch-print-pane">
            <div className="print-queue-header">
              <div>
                <h2>CR80 PVC Direct Print Engine</h2>
                <p>Standard physical specifications: 85.60mm × 53.98mm with 2mm bleed margins and rounded corners. Designed for direct PVC dye-sublimation card printers (Zebra, Evolis, Fargo) or dual-sided perforated card sheets.</p>
              </div>
              <div className="print-controls-bar">
                <span className="selected-counter">
                  {selectedCardIds.length > 0
                    ? `${selectedCardIds.length} card(s) selected for printing`
                    : `Printing all ${cards.length} loaded card(s)`}
                </span>
                <button
                  className="btn btn-primary btn-print-exec"
                  onClick={handleBatchPrint}
                >
                  <Printer size={16} />
                  <span>Print CR80 Batch (Physical Cards)</span>
                </button>
              </div>
            </div>

            {/* Print Preview Sheet Layout */}
            <div className="cr80-sheet-preview">
              {printableCards.map((c) => (
                <div key={c.id} className="cr80-print-unit">
                  <div className="unit-label">
                    <span>{c.cardholder_name} ({c.card_number})</span>
                    <span className="unit-type">{c.cardholder_type?.toUpperCase()}</span>
                  </div>
                  <IdCard3D card={c} showControls={false} printable={true} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            TAB 3: WEB SCANNER & EXAM ADMITTANCE
            ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'scanner' && (
          <div className="tab-pane-content scanner-terminal-pane">
            <div className="scanner-grid">
              {/* Scanner Control Box */}
              <div className="scanner-control-box">
                <div className="terminal-header">
                  <ShieldCheck size={22} className="terminal-icon" />
                  <div>
                    <h3>Invigilation &amp; Verification Terminal</h3>
                    <p>Enter barcode, scan QR code, or paste card verification token to verify admission rights and examination permits.</p>
                  </div>
                </div>

                <form onSubmit={handleScanSubmit} className="terminal-form">
                  <label htmlFor="tokenInput">SCAN CODE OR ENTER TOKEN / ID:</label>
                  <div className="terminal-input-wrap">
                    <input
                      id="tokenInput"
                      type="text"
                      placeholder="e.g. 7c02b9e6... or MBS/2026/0001"
                      value={scannerInput}
                      onChange={(e) => setScannerInput(e.target.value)}
                      className="terminal-input"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={scanLoading || !scannerInput.trim()}
                    >
                      {scanLoading ? 'Checking...' : 'Verify'}
                    </button>
                  </div>
                  <div className="quick-scan-hints">
                    <span>Fast Testing: Paste a QR token from the registry, or copy from a card preview.</span>
                  </div>
                </form>

                {scanError && (
                  <div className="scan-alert alert-error">
                    <XCircle size={18} />
                    <span>{scanError}</span>
                  </div>
                )}

                {scanResult && (
                  <div className="scan-verdict-card">
                    <div className="verdict-banner">
                      <CheckCircle2 size={24} className="verdict-icon-ok" />
                      <div>
                        <h4>CREDENTIAL VERIFIED &amp; ACTIVE</h4>
                        <p>Authenticated by Multitech Central University Registry</p>
                      </div>
                    </div>

                    <div className="verdict-details-grid">
                      <div className="verdict-photo-wrap">
                        {scanResult.card.photo_url ? (
                          <img
                            src={scanResult.card.photo_url}
                            alt="Cardholder"
                            className="verdict-photo"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="verdict-photo placeholder">
                            {scanResult.card.cardholder_name?.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="verdict-info">
                        <h3>{scanResult.card.cardholder_name}</h3>
                        <p className="verdict-role">
                          <strong>Role:</strong> {scanResult.card.role_title} ({scanResult.card.cardholder_type?.toUpperCase()})
                        </p>
                        <p><strong>Identifier:</strong> <span className="mono-font">{scanResult.card.identifier_number}</span></p>
                        <p><strong>Programme/Dept:</strong> {scanResult.card.department_or_programme}</p>
                        <p><strong>Campus:</strong> {scanResult.card.campus_name || 'Main Campus'}</p>
                      </div>
                    </div>

                    {/* Student Clearance Breakdown */}
                    {scanResult.student_clearance && (
                      <div className="student-clearance-section">
                        <h5>EXAMINATION &amp; FINANCIAL CLEARANCE</h5>
                        <div className="clearance-pills-row">
                          <div className={`clearance-pill ${scanResult.student_clearance.is_fees_cleared ? 'cleared' : 'pending'}`}>
                            <span className="pill-title">Tuition Status</span>
                            <span className="pill-val">
                              {scanResult.student_clearance.is_fees_cleared ? '100% Cleared' : `${scanResult.student_clearance.percentage_paid}% Paid`}
                            </span>
                          </div>

                          <div className={`clearance-pill ${scanResult.student_clearance.exam_pass_eligible ? 'cleared' : 'restricted'}`}>
                            <span className="pill-title">Exam Permit</span>
                            <span className="pill-val">
                              {scanResult.student_clearance.exam_pass_eligible ? 'ELIGIBLE' : 'HOLD (UNPAID)'}
                            </span>
                          </div>

                          {scanResult.student_clearance.active_exam_pin && (
                            <div className="clearance-pill exam-pin-pill">
                              <span className="pill-title">SEB Exam PIN</span>
                              <span className="pill-val mono-font">
                                {scanResult.student_clearance.active_exam_pin}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Admittance Action */}
                        <div className="admit-action-strip">
                          <button
                            className="btn btn-primary btn-admit"
                            onClick={handleAdmitCardholder}
                            disabled={admitting}
                          >
                            <UserCheck size={16} />
                            <span>{admitting ? 'Recording Admittance...' : 'Admit into Examination Room'}</span>
                          </button>
                          {admitMessage && (
                            <span className="admit-feedback">{admitMessage}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3D Visualizer of Scanned Card */}
              <div className="scanner-preview-box">
                <h4>LIVE CARD DIGITAL TWIN</h4>
                {scanResult ? (
                  <IdCard3D card={scanResult.card} />
                ) : (
                  <div className="scanner-standby">
                    <CreditCard size={48} className="standby-icon" />
                    <p>Card preview will appear here upon verification</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            TAB 4: VERIFIER PRIVILEGE DELEGATIONS
            ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'delegations' && (
          <div className="tab-pane-content delegations-pane">
            <div className="delegations-header">
              <div>
                <h2>Scanner Privilege Delegation Management</h2>
                <p>Grant temporary or permanent examination scanner and gate-check permissions to staff or student invigilators. Revocable anytime with instant effect.</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowDelegationModal(true)}
              >
                <Key size={16} />
                <span>Grant Verifier Privilege</span>
              </button>
            </div>

            {/* Delegations Table */}
            <div className="table-responsive">
              <table className="id-registry-table">
                <thead>
                  <tr>
                    <th>AUTHORIZED ACCOUNT</th>
                    <th>ACCOUNT TYPE</th>
                    <th>PURPOSE</th>
                    <th>GRANTED AT</th>
                    <th>VALID UNTIL</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {delegationsLoading ? (
                    <tr>
                      <td colSpan={7} className="table-loading">Loading delegations...</td>
                    </tr>
                  ) : delegations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="table-empty">
                        No custom delegations active. Administrators hold default full scanner rights. Click &quot;Grant Verifier Privilege&quot; to authorize an invigilator or staff member.
                      </td>
                    </tr>
                  ) : (
                    delegations.map((del) => {
                      const isExpired = del.valid_until && new Date(del.valid_until) < new Date()
                      const isActive = del.status === 'active' && !isExpired
                      return (
                        <tr key={del.id}>
                          <td>
                            <div className="cell-names">
                              <span className="cell-primary-name">{del.account_name}</span>
                              <span className="cell-secondary-text">{del.account_email}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`role-pill role-${del.user_type}`}>
                              {del.user_type?.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span className="department-cell-text">{del.purpose}</span>
                          </td>
                          <td>
                            <span className="date-cell">{new Date(del.valid_from).toLocaleDateString()}</span>
                          </td>
                          <td>
                            <span className="date-cell">
                              {del.valid_until ? new Date(del.valid_until).toLocaleString() : 'Permanent'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill status-${isActive ? 'active' : 'revoked'}`}>
                              {isActive ? 'ACTIVE' : del.status === 'revoked' ? 'REVOKED' : 'EXPIRED'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isActive && (
                              <button
                                className="btn btn-secondary btn-sm btn-revoke"
                                onClick={() => handleRevokeDelegation(del.id)}
                              >
                                Revoke Privilege
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            MODAL: 3D CARD INTERACTIVE PREVIEW
            ═════════════════════════════════════════════════════════════ */}
        {previewCard && (
          <div className="id-modal-backdrop" onClick={() => setPreviewCard(null)}>
            <div className="id-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{previewCard.cardholder_name}</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setPreviewCard(null)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <IdCard3D card={previewCard} />
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            MODAL: GRANT DELEGATION
            ═════════════════════════════════════════════════════════════ */}
        {showDelegationModal && (
          <div className="id-modal-backdrop" onClick={() => setShowDelegationModal(false)}>
            <div className="id-modal-dialog modal-form-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Grant Verifier Privilege</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowDelegationModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateDelegation} className="modal-form-body">
                <div className="form-group">
                  <label>ACCOUNT EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. invigilator@multitech.ac.ug or student@multitech.ac.ug"
                    value={delegationForm.account_email}
                    onChange={(e) => setDelegationForm({ ...delegationForm, account_email: e.target.value })}
                    className="form-control"
                  />
                  <small>Must match the login email of their portal account.</small>
                </div>

                <div className="form-group">
                  <label>FULL NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Bosco Mukasa"
                    value={delegationForm.account_name}
                    onChange={(e) => setDelegationForm({ ...delegationForm, account_name: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>USER ACCOUNT TYPE</label>
                    <select
                      value={delegationForm.user_type}
                      onChange={(e) => setDelegationForm({ ...delegationForm, user_type: e.target.value })}
                      className="form-control"
                    >
                      <option value="staff">Staff Member</option>
                      <option value="lecturer">Lecturer / Faculty</option>
                      <option value="student">Student Invigilator</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>VALID UNTIL (OPTIONAL)</label>
                    <input
                      type="datetime-local"
                      value={delegationForm.valid_until}
                      onChange={(e) => setDelegationForm({ ...delegationForm, valid_until: e.target.value })}
                      className="form-control"
                    />
                    <small>Leave blank for permanent until revoked.</small>
                  </div>
                </div>

                <div className="form-group">
                  <label>PURPOSE / ASSIGNMENT</label>
                  <input
                    type="text"
                    value={delegationForm.purpose}
                    onChange={(e) => setDelegationForm({ ...delegationForm, purpose: e.target.value })}
                    className="form-control"
                  />
                </div>

                {delegationMessage && (
                  <div className="form-feedback-alert">{delegationMessage}</div>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowDelegationModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={delegationSubmitting}
                  >
                    {delegationSubmitting ? 'Granting...' : 'Authorize Verifier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
