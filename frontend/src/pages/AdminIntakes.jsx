import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Plus,
  Search,
  X
} from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import AdminSidebar from '../components/AdminSidebar'
import './AdminIntakes.css'

const EMPTY_FORM = {
  id: '',
  name: '',
  application_start_date: '',
  application_end_date: '',
  application_fee: '',
  international_fee: '',
  status: 'open',
  linkedProgrammes: []
}

const formatDate = (value) => {
  if (!value) return 'Not set'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not set'
    : new Intl.DateTimeFormat('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

const formatCurrency = (amount, currency) => (
  `${currency} ${Number(amount || 0).toLocaleString('en-UG', { maximumFractionDigits: 2 })}`
)

export default function AdminIntakes() {
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [programmeSearch, setProgrammeSearch] = useState('')
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')
  const [pageNotice, setPageNotice] = useState('')
  const [saving, setSaving] = useState(false)

  const token = localStorage.getItem('adminToken')

  const {
    data: intakesData,
    isLoading: loadingIntakes,
    isError: intakesLoadFailed,
    error: intakesLoadError,
    refetch: fetchIntakes
  } = useApiQuery('/intakes', 'adminIntakes', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })

  const {
    data: programmesData,
    isLoading: loadingProgrammes,
    isError: programmesLoadFailed,
    error: programmesLoadError
  } = useApiQuery('/programmes', 'adminProgrammes')

  const intakes = intakesData?.data || []
  const programmes = programmesData?.data || []
  const counts = useMemo(() => ({
    all: intakes.length,
    open: intakes.filter((intake) => intake.status === 'open').length,
    upcoming: intakes.filter((intake) => intake.status === 'upcoming').length,
    closed: intakes.filter((intake) => intake.status === 'closed').length
  }), [intakes])
  const filteredIntakes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return intakes.filter((intake) => {
      const matchesStatus = statusFilter === 'all' || intake.status === statusFilter
      const matchesSearch = !query
        || intake.name?.toLowerCase().includes(query)
        || intake.programmes?.some((programme) => programme.programme_name?.toLowerCase().includes(query))
      return matchesStatus && matchesSearch
    })
  }, [intakes, searchQuery, statusFilter])
  const filteredProgrammes = programmes.filter((programme) => (
    programme.name?.toLowerCase().includes(programmeSearch.trim().toLowerCase())
  ))

  const openAddModal = () => {
    setFormData({ ...EMPTY_FORM })
    setProgrammeSearch('')
    setFormError('')
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
      international_fee: intake.international_fee || '',
      status: intake.status,
      linkedProgrammes: intake.programmes ? intake.programmes.map((programme) => ({
        programme_id: programme.programme_id,
        intake_status: programme.intake_status
      })) : []
    })
    setProgrammeSearch('')
    setFormError('')
    setEditMode(true)
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
    setFormError('')
  }

  useEffect(() => {
    if (!showModal) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) closeModal()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal, saving])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    if (formData.application_end_date < formData.application_start_date) {
      setFormError('The closing date must be on or after the opening date.')
      return
    }

    try {
      setSaving(true)
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
      setPageNotice(editMode ? 'Intake updated.' : 'Intake created.')
      setPageError('')
      fetchIntakes()
    } catch (error) {
      setFormError(error.response?.data?.message || 'The intake could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const handleProgrammeToggle = (programmeId) => {
    setFormData((previous) => {
      const exists = previous.linkedProgrammes.some((programme) => programme.programme_id === programmeId)
      return {
        ...previous,
        linkedProgrammes: exists
          ? previous.linkedProgrammes.filter((programme) => programme.programme_id !== programmeId)
          : [...previous.linkedProgrammes, { programme_id: programmeId, intake_status: 'open' }]
      }
    })
  }

  const selectAllProgrammes = () => {
    setFormData((previous) => ({
      ...previous,
      linkedProgrammes: programmes.map((programme) => ({
        programme_id: programme.id,
        intake_status: previous.linkedProgrammes.find((linked) => linked.programme_id === programme.id)?.intake_status || 'open'
      }))
    }))
  }

  return (
    <div className="scope-adminintakes admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <header className="admin-intakes-header">
          <div>
            <p className="intakes-eyebrow">Admissions calendar</p>
            <h1>Intakes <em>and applications</em></h1>
            <p className="intakes-subtitle">Set application windows and fees, then choose which programmes students can apply to.</p>
          </div>
          <button type="button" className="intakes-primary-button" onClick={openAddModal}>
            <Plus size={17} /> New intake
          </button>
        </header>

        {pageError && (
          <div className="intakes-feedback intakes-feedback--error" role="alert">
            <AlertCircle size={17} /><span>{pageError}</span>
            <button type="button" onClick={() => setPageError('')} aria-label="Dismiss error"><X size={16} /></button>
          </div>
        )}
        {pageNotice && (
          <div className="intakes-feedback intakes-feedback--success" role="status">
            <Check size={17} /><span>{pageNotice}</span>
            <button type="button" onClick={() => setPageNotice('')} aria-label="Dismiss notification"><X size={16} /></button>
          </div>
        )}

        <section className="intakes-overview" aria-label="Intake status summary">
          {[
            { id: 'open', label: 'Open now', value: counts.open },
            { id: 'upcoming', label: 'Upcoming', value: counts.upcoming },
            { id: 'closed', label: 'Closed', value: counts.closed }
          ].map((item) => (
            <button
              type="button"
              key={item.id}
              className={`intakes-overview-card ${statusFilter === item.id ? 'is-selected' : ''}`}
              onClick={() => setStatusFilter(statusFilter === item.id ? 'all' : item.id)}
              aria-pressed={statusFilter === item.id}
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </button>
          ))}
          <div className="intakes-overview-note">
            <CalendarDays size={18} />
            <span>{counts.all} intake{counts.all === 1 ? '' : 's'} in total</span>
          </div>
        </section>

        <section className="intakes-catalog" aria-labelledby="intakes-catalog-title">
          <div className="intakes-catalog-heading">
            <div>
              <p className="intakes-eyebrow">Intake catalogue</p>
              <h2 id="intakes-catalog-title">Application periods <span>{filteredIntakes.length}</span></h2>
            </div>
            <div className="intakes-tools">
              <label className="intakes-search">
                <Search size={17} aria-hidden="true" />
                <span className="intakes-sr-only">Search intakes and programmes</span>
                <input
                  type="search"
                  placeholder="Search intakes or programmes"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search"><X size={15} /></button>
                )}
              </label>
              <label className="intakes-status-select">
                <span className="intakes-sr-only">Filter by intake status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="open">Open</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            </div>
          </div>

          {loadingIntakes ? (
            <div className="intakes-state" role="status"><span className="intakes-spinner" /> Loading intakes…</div>
          ) : intakesLoadFailed ? (
            <div className="intakes-state intakes-state--error" role="alert">
              <AlertCircle size={24} />
              <p>{intakesLoadError?.response?.data?.message || 'Intakes could not be loaded.'}</p>
              <button type="button" className="intakes-secondary-button" onClick={() => fetchIntakes()}>Try again</button>
            </div>
          ) : filteredIntakes.length > 0 ? (
            <div className="intakes-table-wrap">
              <table className="intakes-table">
                <thead>
                  <tr>
                    <th scope="col">Intake</th>
                    <th scope="col">Application window</th>
                    <th scope="col">Application fee</th>
                    <th scope="col">Status</th>
                    <th scope="col">Programmes</th>
                    <th scope="col"><span className="intakes-sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIntakes.map((intake) => (
                    <tr key={intake.id}>
                      <td>
                        <strong className="intakes-name">{intake.name}</strong>
                        <span className="intakes-intl-fee">
                          International fee: {intake.international_fee && Number(intake.international_fee) > 0
                            ? formatCurrency(intake.international_fee, 'USD')
                            : 'Not set'}
                        </span>
                      </td>
                      <td>
                        <span className="intakes-date-range">
                          {formatDate(intake.application_start_date)} <span>to</span> {formatDate(intake.application_end_date)}
                        </span>
                      </td>
                      <td><span className="intakes-local-fee">{formatCurrency(intake.application_fee, 'UGX')}</span></td>
                      <td><span className={`intakes-status intakes-status--${intake.status}`}>{intake.status}</span></td>
                      <td>
                        <span className="intakes-programme-count">{intake.programmes?.length || 0}</span>
                        <span className="intakes-programme-label">linked</span>
                      </td>
                      <td>
                        <button type="button" className="intakes-edit-button" onClick={() => openEditModal(intake)}>
                          Edit <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="intakes-state intakes-empty-state">
              <span className="intakes-empty-icon"><CalendarDays size={22} /></span>
              <h3>{searchQuery || statusFilter !== 'all' ? 'No matching intakes' : 'No intakes created yet'}</h3>
              <p>{searchQuery || statusFilter !== 'all'
                ? 'Try another search or select a different status.'
                : 'Create an intake to define when students can apply and which programmes are available.'}</p>
              {searchQuery || statusFilter !== 'all' ? (
                <button type="button" className="intakes-secondary-button" onClick={() => { setSearchQuery(''); setStatusFilter('all') }}>
                  Clear filters
                </button>
              ) : (
                <button type="button" className="intakes-primary-button" onClick={openAddModal}><Plus size={16} /> Create an intake</button>
              )}
            </div>
          )}
        </section>

        {showModal && (
          <div
            className="intakes-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal()
            }}
          >
            <section
              className="intakes-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="intake-modal-title"
              aria-describedby="intake-modal-description"
            >
              <header className="intakes-modal-header">
                <div>
                  <p className="intakes-eyebrow">{editMode ? 'Update intake' : 'New intake'}</p>
                  <h2 id="intake-modal-title">{editMode ? 'Intake details' : 'Create an intake'}</h2>
                  <p id="intake-modal-description">Set the application dates, fees, status, and available programmes.</p>
                </div>
                <button type="button" className="intakes-modal-close" onClick={closeModal} disabled={saving} aria-label="Close dialog">
                  <X size={19} />
                </button>
              </header>

              {formError && (
                <div className="intakes-feedback intakes-feedback--error" role="alert">
                  <AlertCircle size={17} /><span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="intakes-form">
                <div className="intakes-form-section">
                  <div className="intakes-form-section-heading">
                    <span>01</span>
                    <div><h3>Application period</h3><p>Choose the public name and application window.</p></div>
                  </div>
                  <div className="intakes-form-grid">
                    <div className="intakes-form-field intakes-form-field--wide">
                      <label htmlFor="intake-name">Intake name <span>*</span></label>
                      <input
                        id="intake-name"
                        type="text"
                        value={formData.name}
                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                        required
                        autoFocus
                        placeholder="e.g. September 2026 Intake"
                      />
                    </div>
                    <div className="intakes-form-field">
                      <label htmlFor="intake-start-date">Applications open <span>*</span></label>
                      <input
                        id="intake-start-date"
                        type="date"
                        value={formData.application_start_date}
                        onChange={(event) => setFormData({ ...formData, application_start_date: event.target.value })}
                        required
                      />
                    </div>
                    <div className="intakes-form-field">
                      <label htmlFor="intake-end-date">Applications close <span>*</span></label>
                      <input
                        id="intake-end-date"
                        type="date"
                        min={formData.application_start_date || undefined}
                        value={formData.application_end_date}
                        onChange={(event) => setFormData({ ...formData, application_end_date: event.target.value })}
                        required
                      />
                    </div>
                    <div className="intakes-form-field">
                      <label htmlFor="intake-status">Intake status <span>*</span></label>
                      <select id="intake-status" value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })}>
                        <option value="open">Open — accepting applications</option>
                        <option value="upcoming">Upcoming — not yet open</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="intakes-form-section">
                  <div className="intakes-form-section-heading">
                    <span>02</span>
                    <div><h3>Application fees</h3><p>Set fees in the appropriate currency.</p></div>
                  </div>
                  <div className="intakes-form-grid">
                    <div className="intakes-form-field">
                      <label htmlFor="intake-local-fee">Local fee <span>*</span></label>
                      <div className="intakes-currency-field">
                        <span>UGX</span>
                        <input
                          id="intake-local-fee"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.application_fee}
                          onChange={(event) => setFormData({ ...formData, application_fee: event.target.value })}
                          required
                          placeholder="50000"
                        />
                      </div>
                    </div>
                    <div className="intakes-form-field">
                      <label htmlFor="intake-international-fee">International fee</label>
                      <div className="intakes-currency-field">
                        <span>USD</span>
                        <input
                          id="intake-international-fee"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.international_fee}
                          onChange={(event) => setFormData({ ...formData, international_fee: event.target.value })}
                          placeholder="Optional"
                        />
                      </div>
                      <small>Leave blank if the local fee applies.</small>
                    </div>
                  </div>
                </div>

                <div className="intakes-form-section intakes-programmes-section">
                  <div className="intakes-form-section-heading">
                    <span>03</span>
                    <div>
                      <h3>Available programmes</h3>
                      <p>Select the programmes students can apply to in this intake.</p>
                    </div>
                    <span className="intakes-selected-count">{formData.linkedProgrammes.length} selected</span>
                  </div>
                  {programmesLoadFailed ? (
                    <div className="intakes-feedback intakes-feedback--error" role="alert">
                      <AlertCircle size={17} />
                      <span>{programmesLoadError?.response?.data?.message || 'Programmes could not be loaded.'}</span>
                    </div>
                  ) : loadingProgrammes ? (
                    <div className="intakes-programmes-loading"><span className="intakes-spinner" /> Loading programmes…</div>
                  ) : programmes.length === 0 ? (
                    <p className="intakes-no-programmes">No active programmes are available to link.</p>
                  ) : (
                    <>
                      <div className="intakes-programme-tools">
                        <label className="intakes-search intakes-programme-search">
                          <Search size={16} aria-hidden="true" />
                          <span className="intakes-sr-only">Search programmes</span>
                          <input
                            type="search"
                            value={programmeSearch}
                            onChange={(event) => setProgrammeSearch(event.target.value)}
                            placeholder="Find a programme"
                          />
                          {programmeSearch && (
                            <button type="button" onClick={() => setProgrammeSearch('')} aria-label="Clear programme search"><X size={14} /></button>
                          )}
                        </label>
                        <div>
                          <button type="button" onClick={selectAllProgrammes} className="intakes-text-button">Select all</button>
                          <button type="button" onClick={() => setFormData({ ...formData, linkedProgrammes: [] })} className="intakes-text-button">Clear all</button>
                        </div>
                      </div>
                      <div className="intakes-programme-list">
                        {filteredProgrammes.length > 0 ? filteredProgrammes.map((programme) => {
                          const selected = formData.linkedProgrammes.some((linked) => linked.programme_id === programme.id)
                          return (
                            <label key={programme.id} className={`intakes-programme-option ${selected ? 'is-selected' : ''}`}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => handleProgrammeToggle(programme.id)}
                              />
                              <span className="intakes-programme-check"><Check size={13} /></span>
                              <span className="intakes-programme-option-copy">
                                <strong>{programme.name}</strong>
                                <small>{programme.level || 'Level not specified'}</small>
                              </span>
                            </label>
                          )
                        }) : (
                          <p className="intakes-no-programmes">No programmes match your search.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <footer className="intakes-modal-actions">
                  <button type="button" className="intakes-secondary-button" onClick={closeModal} disabled={saving}>Cancel</button>
                  <button type="submit" className="intakes-primary-button" disabled={saving || loadingProgrammes || programmesLoadFailed}>
                    {saving ? 'Saving…' : editMode ? 'Save changes' : 'Create intake'}
                    {!saving && <ChevronRight size={16} />}
                  </button>
                </footer>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
