import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import StudentSidebar from '../components/StudentSidebar'
import { useApiQuery } from '../hooks/useApiQuery'
import { Key, Clock, Calendar, ShieldCheck, Download, Inbox, FileText, CheckCircle2, Laptop, Paperclip, Monitor } from 'lucide-react'
import './AdminDashboard.css'
import './StudentExams.css'

const API = import.meta.env.VITE_API_URL

function getStatusBadge(exam) {
  const now = new Date()
  const start = new Date(exam.start_time)
  const end = new Date(exam.end_time)

  if (exam.status === 'archived') return { label: 'Archived', cls: 'badge-archived' }
  if (now < start) return { label: 'Upcoming', cls: 'badge-upcoming' }
  if (now >= start && now <= end) return { label: 'Active Now', cls: 'badge-active' }
  return { label: 'Ended', cls: 'badge-ended' }
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-UG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function StudentExams() {
  // PIN state
  const [pin, setPin] = useState(null)
  const [pinExpiry, setPinExpiry] = useState(null)
  const [pinCountdown, setPinCountdown] = useState('')
  const [generatingPin, setGeneratingPin] = useState(false)
  const [pinError, setPinError] = useState('')

  // SEB download feedback
  const [downloadingId, setDownloadingId] = useState(null)

  const token = localStorage.getItem('studentToken')

  const { data, isLoading, error } = useApiQuery(`${API}/student-profile/exams`, 'studentExams', {
    axiosOptions: { headers: { Authorization: `Bearer ${token}` } }
  })
  const exams = data?.data || []

  // Countdown timer for the PIN
  useEffect(() => {
    if (!pinExpiry) return
    const interval = setInterval(() => {
      const diff = Math.max(0, new Date(pinExpiry) - new Date())
      if (diff === 0) {
        setPin(null)
        setPinExpiry(null)
        setPinCountdown('')
        clearInterval(interval)
        return
      }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setPinCountdown(`${mins}:${secs.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [pinExpiry])

  const generatePin = async () => {
    setGeneratingPin(true)
    setPinError('')
    try {
      const res = await axios.post(`${API}/student-profile/exam-pin`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setPin(res.data.pin)
      setPinExpiry(res.data.expiresAt)
    } catch (err) {
      setPinError('Failed to generate PIN. Please try again.')
    } finally {
      setGeneratingPin(false)
    }
  }

  const downloadSEB = (exam) => {
    if (!exam.seb_file_base64) return
    setDownloadingId(exam.id)

    try {
      const binary = atob(exam.seb_file_base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/seb' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exam.exam_title.replace(/[^a-z0-9]/gi, '_')}.seb`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('SEB download failed', e)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="scope-studentexams scope-admindashboard admin-layout fade-in-section is-visible">
      <StudentSidebar />
      <main className="admin-content" style={{ background: 'var(--color-background)' }}>
        <header className="content-header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-secondary)', margin: '0 0 0.25rem 0' }}>Examination Portal</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Safe Exam Browser (SEB) configuration and single-use identity PINs</p>
        </header>

        <div className="exams-container">
          {/* Top PIN Generation Card */}
          <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '1.75rem', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
                  <div className="stat-icon-wrapper bg-indigo" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                    <Key size={18} className="text-indigo" />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-secondary)' }}>SEB Authentication PIN</h3>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                  Generate your temporary 6-digit identity PIN before launching Safe Exam Browser. Each PIN is valid for 1 hour and supports seamless re-entry if your connection drops or your computer restarts.
                </p>
              </div>

              <div>
                {pin ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Active PIN</span>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-primary)', letterSpacing: '3px' }}>
                        {pin}
                      </div>
                    </div>
                    <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '1rem', fontSize: '0.8rem', color: '#475569' }}>
                      <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> {pinCountdown}
                      </span>
                      <span>Re-entry supported</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    {pinError && <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: '0 0 6px 0' }}>{pinError}</p>}
                    <button
                      id="btn-generate-pin"
                      className="button button-primary"
                      onClick={generatePin}
                      disabled={generatingPin}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Key size={16} /> {generatingPin ? 'Generating...' : 'Generate Exam PIN'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.06)', padding: '1.5rem', marginBottom: '2rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--color-secondary)' }}>Exam Readiness Checklist</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span className="status-pill status-admitted" style={{ height: 'fit-content' }}>1</span>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>Download SEB File</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Download the specific exam configuration file below.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span className="status-pill status-admitted" style={{ height: 'fit-content' }}>2</span>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>Generate PIN</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Generate your 6-digit access PIN before exam start.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span className="status-pill status-admitted" style={{ height: 'fit-content' }}>3</span>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>Launch &amp; Verify</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Open SEB, enter your PIN, and start your examination.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span className="status-pill status-admitted" style={{ height: 'fit-content' }}>4</span>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>Permitted Apps</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>If IDEs or tools are permitted, install and open them as needed.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Exams List */}
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading scheduled exams...</p>
            </div>
          ) : error ? (
            <div className="message-error">{error}</div>
          ) : exams.length === 0 ? (
            <div className="empty-state" style={{ padding: '3.5rem', background: 'white', borderRadius: '16px', textAlign: 'center' }}>
              <Inbox size={40} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-secondary)' }}>No Scheduled Online Exams</h3>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>There are no active or upcoming digital exams scheduled for your enrolled courses.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {exams.map((exam) => {
                const badge = getStatusBadge(exam)
                const canDownload = !!exam.seb_file_base64
                return (
                  <div key={exam.id} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className={`status-pill status-${badge.cls === 'badge-active' ? 'admitted' : badge.cls === 'badge-upcoming' ? 'pending' : 'rejected'}`}>
                            {badge.label}
                          </span>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: exam.assessment_type === 'coursework' ? '#fdf4ff' : '#eef2ff',
                            color: exam.assessment_type === 'coursework' ? '#9333ea' : '#4338ca',
                            border: exam.assessment_type === 'coursework' ? '1px solid #f0abfc' : '1px solid #c7d2fe'
                          }}>
                            {exam.assessment_type === 'coursework' ? '📝 Coursework / CAT' : '🎓 Final Examination'} ({Number(exam.weight_percentage) || (exam.assessment_type === 'coursework' ? 40 : 60)}%)
                          </span>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>
                          {exam.erp_course_code}
                        </span>
                      </div>

                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', color: 'var(--color-secondary)' }}>
                        {exam.exam_title}
                      </h3>

                      <div style={{ display: 'grid', gap: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={14} /> Starts: {formatDate(exam.start_time)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={14} /> Ends: {formatDate(exam.end_time)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={14} /> Duration: {exam.duration_minutes} minutes
                        </div>
                      </div>

                      {/* Post-Exam Graded Banner */}
                      {(() => {
                        const isCw = exam.assessment_type === 'coursework'
                        const mark = isCw ? exam.coursework_mark : exam.exam_mark
                        if (mark === null || mark === undefined) return null

                        return (
                          <div style={{
                            background: '#f0fdf4',
                            border: '1px solid #86efac',
                            borderRadius: '10px',
                            padding: '0.75rem 1rem',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#15803d' }}>
                                  Graded &amp; Synchronized
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#166534' }}>
                                  Official score posted to Academic Gradebook
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#15803d' }}>
                                {mark}%
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#166534' }}>
                                Grade: {exam.grade_letter || 'Recorded'}
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      {/* External Applications Badge & Tag List */}
                      {(() => {
                        const apps = Array.isArray(exam.permitted_apps)
                          ? exam.permitted_apps
                          : typeof exam.permitted_apps === 'string'
                            ? (() => { try { return JSON.parse(exam.permitted_apps) } catch { return [] } })()
                            : []
                        if (apps.length === 0) return null
                        return (
                          <div style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '10px',
                            padding: '0.75rem',
                            marginBottom: '1rem',
                            fontSize: '0.82rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 600, marginBottom: '6px' }}>
                              <Laptop size={14} /> Allowed Applications ({apps.length})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {apps.map((app, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #86efac',
                                    color: '#15803d',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                  }}
                                >
                                  {app.title || app.executable}
                                </span>
                              ))}
                            </div>
                            <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#166534', opacity: 0.9 }}>
                              These tools are permitted and switchable inside Safe Exam Browser.
                            </p>
                          </div>
                        )
                      })()}

                      {/* File Submissions Required / Allowed Badge */}
                      {exam.allow_file_upload && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#1e40af',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          marginBottom: '1rem'
                        }}>
                          <Paperclip size={13} /> File attachment submissions enabled
                        </div>
                      )}
                    </div>

                    <div style={{ paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                      {canDownload ? (
                        <button
                          id={`btn-download-seb-${exam.id}`}
                          className="button button-primary"
                          onClick={() => downloadSEB(exam)}
                          disabled={downloadingId === exam.id}
                          style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          <Download size={16} />
                          {downloadingId === exam.id ? 'Preparing SEB File...' : 'Download SEB File'}
                        </button>
                      ) : (exam.coursework_mark != null || exam.exam_mark != null) ? (
                        <Link
                          to="/student/results"
                          className="button button-primary"
                          style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
                        >
                          View in Academic Results
                        </Link>
                      ) : badge.cls === 'badge-ended' ? (
                        <div style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          textAlign: 'center',
                          fontSize: '0.84rem',
                          color: '#64748b',
                          fontWeight: 500
                        }}>
                          Exam Concluded • Marking in Progress
                        </div>
                      ) : (
                        <button className="button" disabled style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }}>
                          SEB file unavailable
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
