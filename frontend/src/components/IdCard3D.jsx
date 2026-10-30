import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { RotateCw, ShieldCheck, Download, FlipHorizontal, Eye } from 'lucide-react'
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
  const cardRef = useRef(null)

  const verificationUrl = card?.qr_token
    ? `${window.location.origin}/verify/id/${card.qr_token}`
    : ''

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

            {/* Header Banner */}
            <header className="card-header">
              <div className="card-brand">
                <img
                  src="/logo_asset.png"
                  alt="Multitech Business School"
                  className="card-crest"
                  onError={(e) => {
                    // Fallback to text seal if asset is unavailable
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
          </div>

          {/* ═══════════════════════════════════════════════════════════
              CARD BACK (CR80 Standard)
              ═══════════════════════════════════════════════════════════ */}
          <div className="id-card-face id-card-back">
            {/* Magnetic Stripe Simulator */}
            <div className="card-magnetic-stripe">
              <span className="stripe-glare" />
            </div>

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
