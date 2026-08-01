import { useState, useEffect } from 'react'
import axios from 'axios'
import StudentSidebar from '../components/StudentSidebar'
import { useApiQuery } from '../hooks/useApiQuery'
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

  const { data, isLoading, error } = useApiQuery(`${API}/student-profile/exams`, {
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
    <div className="admin-layout">
      <StudentSidebar />
      <main className="admin-content student-dashboard-main">
        <div className="exams-container">

          {/* Page Header */}
          <header className="exams-header">
            <div className="exams-header-left">
              <h2>My Exams</h2>
              <p className="text-muted">
                Online exams scheduled for your registered courses. Download the SEB file and generate your Exam PIN before joining.
              </p>
            </div>
            <div className="exams-header-right">
              <div className="pin-card">
                <div className="pin-card-header">
                  <span className="pin-icon">🔐</span>
                  <span className="pin-title">Exam PIN</span>
                </div>

                {pin ? (
                  <div className="pin-display">
                    <div className="pin-digits">{pin}</div>
                    <div className="pin-meta">
                      <span className="pin-timer">⏱ Expires in {pinCountdown}</span>
                      <span className="pin-hint">Enter this PIN inside SEB to identify yourself</span>
                    </div>
                  </div>
                ) : (
                  <div className="pin-actions">
                    <p className="pin-hint">Generate a one-time PIN to authenticate inside Safe Exam Browser.</p>
                    {pinError && <p className="pin-error">{pinError}</p>}
                    <button
                      id="btn-generate-pin"
                      className="btn-primary btn-pin"
                      onClick={generatePin}
                      disabled={generatingPin}
                    >
                      {generatingPin ? 'Generating…' : '🔑 Generate Exam PIN'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* How It Works */}
          <div className="how-it-works">
            <h3>How to Take Your Online Exam</h3>
            <ol className="steps-list">
              <li>
                <span className="step-num">1</span>
                <div>
                  <strong>Download the SEB File</strong>
                  <p>Click the download button on your exam below. This file configures Safe Exam Browser for your specific exam.</p>
                </div>
              </li>
              <li>
                <span className="step-num">2</span>
                <div>
                  <strong>Generate Your PIN</strong>
                  <p>Click "Generate Exam PIN" above. Your PIN is valid for 1 hour and is single-use — it links your identity securely.</p>
                </div>
              </li>
              <li>
                <span className="step-num">3</span>
                <div>
                  <strong>Launch SEB & Enter Your PIN</strong>
                  <p>Double-click the downloaded <code>.seb</code> file. SEB will open and prompt for your 6-digit PIN. Enter it to join.</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Exams List */}
          {isLoading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : error ? (
            <div className="message-error">Could not load your exams. Please try again later.</div>
          ) : exams.length === 0 ? (
            <div className="exams-empty">
              <span className="empty-icon">📋</span>
              <h3>No Exams Scheduled</h3>
              <p>No online exams are currently scheduled for your registered courses. Check back closer to your exam dates.</p>
            </div>
          ) : (
            <div className="exams-grid">
              {exams.map((exam) => {
                const badge = getStatusBadge(exam)
                const canDownload = !!exam.seb_file_base64
                return (
                  <div key={exam.id} className={`exam-card ${badge.cls === 'badge-active' ? 'exam-card--active' : ''}`}>
                    <div className="exam-card-header">
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                      <span className="exam-course-code">{exam.erp_course_code}</span>
                    </div>

                    <h3 className="exam-title">{exam.exam_title}</h3>

                    <div className="exam-meta-grid">
                      <div className="exam-meta-item">
                        <span className="meta-icon">📅</span>
                        <div>
                          <span className="meta-label">Starts</span>
                          <span className="meta-val">{formatDate(exam.start_time)}</span>
                        </div>
                      </div>
                      <div className="exam-meta-item">
                        <span className="meta-icon">🏁</span>
                        <div>
                          <span className="meta-label">Ends</span>
                          <span className="meta-val">{formatDate(exam.end_time)}</span>
                        </div>
                      </div>
                      <div className="exam-meta-item">
                        <span className="meta-icon">⏳</span>
                        <div>
                          <span className="meta-label">Duration</span>
                          <span className="meta-val">{exam.duration_minutes} minutes</span>
                        </div>
                      </div>
                    </div>

                    <div className="exam-card-actions">
                      {canDownload ? (
                        <button
                          id={`btn-download-seb-${exam.id}`}
                          className="btn-primary btn-download"
                          onClick={() => downloadSEB(exam)}
                          disabled={downloadingId === exam.id}
                        >
                          {downloadingId === exam.id
                            ? '⏳ Preparing…'
                            : '⬇️ Download SEB File'}
                        </button>
                      ) : (
                        <button className="btn-disabled" disabled>
                          {badge.cls === 'badge-upcoming'
                            ? '🔒 SEB file not yet available'
                            : '📂 SEB file unavailable'}
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
