import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { RotateCw, ShieldCheck, Download, FlipHorizontal, Eye, Lock, Key } from 'lucide-react'
import api from '../services/api'
import './IdCard3D.css'

export default function IdCard3D({
  card,
  printable = false,
  showControls = true,
  className = ''
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [liveTime, setLiveTime] = useState(new Date())
  const [sebPin, setSebPin] = useState(null)
  const [fetchingPin, setFetchingPin] = useState(false)
  const cardRef = useRef(null)

  const verificationUrl = card?.qr_token
    ? `${window.location.origin}/verify/id/${card.qr_token}`
    : ''

  // Live ticking cryptographic clock
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Generate QR Code data URL
  useEffect(() => {
    if (verificationUrl) {
      QRCode.toDataURL(verificationUrl, {
        width: 180,
        margin: 1,
        color: {
          dark: '#0b1528',
          light: '#ffffff'
        }
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err))
    }
  }, [verificationUrl])

  // Gyroscope / device orientation on mobile
  useEffect(() => {
    if (printable) return
    const handleOrientation = (e) => {
      if (isRotating) return
      const beta = Math.max(-25, Math.min(25, e.beta || 0))   // front-back tilt
      const gamma = Math.max(-25, Math.min(25, e.gamma || 0)) // left-right tilt
      setTilt({ x: beta * 0.35, y: gamma * 0.35 })
    }
    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [isRotating, printable])

  // Mouse tilt perspective handler
  const handleMouseMove = (e) => {
    if (isRotating || printable) return
    const cardEl = cardRef.current
    if (!cardEl) return
    const rect = cardEl.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    const rotateY = (x / (rect.width / 2)) * 12
    const rotateX = -(y / (rect.height / 2)) * 12
    setTilt({ x: rotateX, y: rotateY })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  const toggleFlip = () => {
    setIsRotating(false)
    setIsFlipped(!isFlipped)
  }

  const handle360Rotate = () => {
    if (isRotating) return
    setIsRotating(true)
    setTimeout(() => {
      setIsRotating(false)
    }, 2400) // Duration of 360 spin animation
  }

  // 1-Tap SEB Exam Unlock
  const handleFetchSebPin = async () => {
    if (sebPin) {
      setSebPin(null)
      return
    }
    try {
      setFetchingPin(true)
      const token = localStorage.getItem('studentToken') || localStorage.getItem('token') || localStorage.getItem('adminToken')
      const res = await api.get(`/id-cards/verify/${card.qr_token}/seb-pin`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.data?.success && res.data.data?.has_active_pin) {
        setSebPin(res.data.data)
      } else {
        alert(res.data?.data?.message || 'No scheduled exam paper with active PIN today.')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to retrieve today\'s exam PIN')
    } finally {
      setFetchingPin(false)
    }
  }

  if (!card) {
    return (
      <div className="id-card-empty-state">
        <p>No card data available.</p>
      </div>
    )
  }

  const roleType = (card.cardholder_type || 'student').toLowerCase()
  const roleLabel = {
    student: 'STUDENT',
    lecturer: 'LECTURER',
    administrative: 'ADMINISTRATIVE STAFF',
    support_staff: 'SUPPORT STAFF'
  }[roleType] || 'INSTITUTIONAL'

  const formatDate = (dateString) => {
    if (!dateString) return 'DEC 2028'
    const d = new Date(dateString)
    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
    return `${month} ${d.getFullYear()}`
  }

  const formattedLiveTime = liveTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formattedLiveDate = liveTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  // Base style for tilt transform
  const cardTransform = isRotating
    ? undefined
    : `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y + (isFlipped ? 180 : 0)}deg)`

  return (
    <div className={`id-card-wrapper ${className} ${printable ? 'printable-view' : ''}`}>
      {/* 3D Card Stage */}
      <div
        className="id-card-stage"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={cardRef}
          className={`id-card-container role-${roleType} ${isFlipped ? 'flipped' : ''} ${isRotating ? 'rotating-360' : ''}`}
          style={{ transform: cardTransform }}
        >
          {/* ═══════════════════════════════════════════════════════════
              CARD FRONT (CR80 Standard)
              ═══════════════════════════════════════════════════════════ */}
          <div className="id-card-face id-card-front">
            {/* Fine Guilloche & Security Pattern Background */}
            <div className="card-security-pattern" />
            <div className="card-hologram-seal" />

            {/* Dynamic Gyroscope Shimmer Sheen */}
            <div
              className="card-shimmer-overlay"
              style={{
                '--tilt-x': `${tilt.x}deg`,
                '--tilt-y': `${tilt.y}deg`
              }}
            />

            {/* Header Banner */}
            <header className="card-header">
              <div className="card-brand">
                <img
                  src="/logo_asset.png"
                  alt="Multitech Business School"
                  className="card-crest"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
                <div className="card-brand-titles">
                  <h1 className="card-institution-name">MULTITECH BUSINESS SCHOOL</h1>
                  <p className="card-motto">KAMPALA • UGANDA | EXCELLENCE IN BUSINESS &amp; TECHNOLOGY</p>
                </div>
              </div>
              <div className={`card-role-badge role-${roleType}`}>
                {roleLabel}
              </div>
            </header>

            {/* Main Body */}
            <div className="card-front-body">
              {/* Left Column: Photo & Chip */}
              <div className="card-photo-column">
                <div className="card-photo-frame">
                  {card.photo_url ? (
                    <img
                      src={card.photo_url}
                      alt={card.cardholder_name}
                      className="card-photo"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="card-photo-placeholder">
                      <span>{(card.cardholder_name || 'MB').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="card-photo-corner-accent" />
                </div>

                {/* Smart Contact Chip Graphic */}
                <div className="card-smart-chip" title="Contactless & Smart Storage Secure ID">
                  <div className="chip-lines line-top" />
                  <div className="chip-core" />
                  <div className="chip-lines line-bottom" />
                </div>
              </div>

              {/* Right Column: Identification Details */}
              <div className="card-details-column">
                <div className="detail-group name-group">
                  <label>NAME</label>
                  <h2 className="cardholder-name">{card.cardholder_name || 'CARDHOLDER NAME'}</h2>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label>{roleType === 'student' ? 'REG / STUDENT NO' : 'EMPLOYEE NO'}</label>
                    <span className="identifier-number mono-font">
                      {card.identifier_number || 'MBS/2026/0000'}
                    </span>
                  </div>
                  <div className="detail-group">
                    <label>CARD NO</label>
                    <span className="card-number mono-font">{card.card_number}</span>
                  </div>
                </div>

                <div className="detail-group">
                  <label>{roleType === 'student' ? 'PROGRAMME OF STUDY' : 'DEPARTMENT / FACULTY'}</label>
                  <span className="department-title">
                    {card.department_or_programme || 'Multitech Academic Operations'}
                  </span>
                </div>

                <div className="detail-row footer-row">
                  <div className="detail-group">
                    <label>VALID THRU</label>
                    <span className="expiry-date mono-font">{formatDate(card.expires_at)}</span>
                  </div>
                  <div className="detail-group">
                    <label>CAMPUS</label>
                    <span className="campus-name">{card.campus_name || 'Main Campus'}</span>
                  </div>
                  <div className="detail-group signature-box">
                    <div className="signature-line" />
                    <label>ACADEMIC REGISTRAR</label>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Synchronized Cryptographic Clock */}
            <div className="card-live-clock" title="Live synchronized timestamp proving active session">
              <span className="clock-pulse-dot" />
              <span className="clock-time">{formattedLiveTime}</span>
              <span className="clock-date">{formattedLiveDate}</span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              CARD BACK (CR80 Standard)
              ═══════════════════════════════════════════════════════════ */}
          <div className="id-card-face id-card-back">
            {/* Magnetic Stripe Simulator */}
            <div className="card-magnetic-stripe">
              <span className="stripe-glare" />
            </div>

            {/* Dynamic Gyroscope Shimmer Sheen on Back */}
            <div
              className="card-shimmer-overlay"
              style={{
                '--tilt-x': `${tilt.x}deg`,
                '--tilt-y': `${tilt.y}deg`
              }}
            />

            {/* NFC UID Chip Indicator (if present) */}
            {card.nfc_uid && (
              <div className="card-nfc-indicator" title={`NFC UID: ${card.nfc_uid}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 0 1 10 10"/>
                  <path d="M12 6a6 6 0 0 1 6 6"/>
                  <path d="M12 10a2 2 0 0 1 2 2"/>
                  <circle cx="12" cy="20" r="1"/>
                </svg>
                <span>NFC ENABLED</span>
              </div>
            )}

            <div className="card-back-content">
              {/* Left Column: Barcode & Rules */}
              <div className="card-back-left">
                <div className="card-terms">
                  <p>1. This card is the property of Multitech Business School and must be produced upon demand by authorized security, invigilators, or administrative officers.</p>
                  <p>2. Mandatory for admission into examinations, laboratories, library services, and student/staff voting.</p>
                  <p>3. If lost or found, please return to the Academic Registrar&apos;s Office, Kyadondo Road, Kampala, Uganda or telephone +256 414 250 499.</p>
                </div>

                {/* 1D Barcode Simulator */}
                <div className="card-barcode-container">
                  <div className="barcode-bars" />
                  <span className="barcode-text mono-font">
                    *{card.barcode_value || card.card_number}*
                  </span>
                </div>

                {/* Card Emergency & Biological Metadata */}
                <div className="card-meta-strip">
                  {card.blood_group && (
                    <span className="meta-item">
                      <strong>Blood Group:</strong> {card.blood_group}
                    </span>
                  )}
                  {card.emergency_contact && (
                    <span className="meta-item">
                      <strong>Emergency:</strong> {card.emergency_contact}
                    </span>
                  )}
                  <span className="meta-item security-hash">
                    <strong>HASH:</strong> {card.qr_token ? card.qr_token.slice(0, 10).toUpperCase() : 'SECURED'}
                  </span>
                </div>

                {/* Authorized Registrar Signature Block */}
                <div className="card-signature-block">
                  <div className="signature-line" />
                  <span className="signature-title">ACADEMIC REGISTRAR</span>
                  <span className="signature-institution">Multitech Business School</span>
                </div>
              </div>

              {/* Right Column: 2D QR Verification Seal */}
              <div className="card-back-right">
                <div className="qr-container">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Verification QR Code"
                      className="card-qr-img"
                    />
                  ) : (
                    <div className="qr-placeholder">Generating QR...</div>
                  )}
                  <span className="qr-caption">SCAN TO VERIFY</span>
                  <div className="qr-shield">
                    <ShieldCheck size={14} />
                    <span>AUTHENTIC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1-Tap SEB Exam Unlock Banner */}
      {sebPin && (
        <div className="seb-pin-reveal-banner">
          <div className="seb-pin-badge">
            <Lock size={16} />
            <div>
              <div className="seb-pin-title">TODAY&apos;S SEB EXAM PIN: <span className="seb-pin-num">{sebPin.pin_code}</span></div>
              <div className="seb-pin-sub">{sebPin.course_name || 'Active Examination'} • Valid Today</div>
            </div>
          </div>
        </div>
      )}

      {/* Permit Status Badge */}
      {card.permit_status && (
        <div className={`permit-status-badge permit-${card.permit_status}`}>
          <ShieldCheck size={14} />
          <span>
            {card.permit_status === 'valid' && 'Exam Permit: Valid & Admitted'}
            {card.permit_status === 'conditional' && 'Exam Permit: Conditional (Fees Outstanding)'}
            {card.permit_status === 'blocked' && 'Entry Blocked — Refer to Admin'}
            {card.permit_status === 'expired' && 'Card Expired'}
          </span>
        </div>
      )}

      {/* Interactive Controls (Hidden during physical print) */}
      {showControls && (
        <div className="id-card-controls">
          <button
            type="button"
            className="card-ctrl-btn btn-flip"
            onClick={toggleFlip}
            title="Flip to other side"
          >
            <FlipHorizontal size={15} />
            <span>{isFlipped ? 'View Front Face' : 'View Back Face'}</span>
          </button>

          <button
            type="button"
            className={`card-ctrl-btn btn-rotate ${isRotating ? 'is-active' : ''}`}
            onClick={handle360Rotate}
            disabled={isRotating}
            title="Sleek 360-degree card revolution"
          >
            <RotateCw size={15} className={isRotating ? 'spin-icon' : ''} />
            <span>{isRotating ? 'Rotating 360°...' : '360° Rotate'}</span>
          </button>

          {roleType === 'student' && card.qr_token && (
            <button
              type="button"
              className={`card-ctrl-btn btn-seb-unlock ${sebPin ? 'has-pin' : ''}`}
              onClick={handleFetchSebPin}
              disabled={fetchingPin}
              title="1-Tap SEB Exam Unlock: Surface today's active exam PIN"
            >
              <Key size={15} />
              <span>{fetchingPin ? 'Checking PIN...' : sebPin ? 'Hide Exam PIN' : "Today's Exam PIN"}</span>
            </button>
          )}

          {card.qr_token && (
            <a
              href={`/verify/id/${card.qr_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="card-ctrl-btn btn-verify-link"
              title="Open public verification page"
            >
              <Eye size={15} />
              <span>Verify Page</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
