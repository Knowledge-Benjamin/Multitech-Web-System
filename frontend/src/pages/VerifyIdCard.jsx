import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ShieldCheck, AlertTriangle, XCircle, CheckCircle2, UserCheck,
  Building, Calendar, Clock, CreditCard, Lock, ArrowLeft, Award, Key
} from 'lucide-react'
import api from '../services/api'
import IdCard3D from '../components/IdCard3D'
import './VerifyIdCard.css'

export default function VerifyIdCard() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [admitting, setAdmitting] = useState(false)
  const [admitMessage, setAdmitMessage] = useState('')
  const [invigilating, setInvigilating] = useState(false)
  const [invigilateMsg, setInvigilateMsg] = useState('')

  useEffect(() => {
    const verifyCard = async () => {
      try {
        setLoading(true)
        setError('')
        const tokenAuth = localStorage.getItem('token') || localStorage.getItem('adminToken') || localStorage.getItem('lecturerToken') || localStorage.getItem('studentToken')
        const res = await api.get(`/id-cards/verify/${token}`, {
          headers: tokenAuth ? { Authorization: `Bearer ${tokenAuth}` } : {}
        })
        if (res.data?.success) {
          setData(res.data)
        } else {
          setError(res.data?.message || 'Verification record not found.')
        }
      } catch (err) {
        setError(err.response?.data?.message || 'This credential could not be verified. It may be invalid, revoked, or expired.')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      verifyCard()
    }
  }, [token])

  const handleAdmit = async () => {
    try {
      setAdmitting(true)
      setAdmitMessage('')
      const tokenAuth = localStorage.getItem('token') || localStorage.getItem('adminToken')
      const res = await api.post(`/id-cards/verify/${token}/admit`, {
        action_type: 'admitted_exam',
        room_or_hall: 'Main Examination Hall',
        notes: 'Admitted via verification web gateway'
      }, {
        headers: tokenAuth ? { Authorization: `Bearer ${tokenAuth}` } : {}
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

  const handleStartInvigilatorSession = async () => {
    try {
      setInvigilating(true)
      setInvigilateMsg('')
      const tokenAuth = localStorage.getItem('lecturerToken') || localStorage.getItem('token') || localStorage.getItem('adminToken')
      const res = await api.post('/id-cards/invigilator-session', {
        lecturer_card_token: token,
        room_location: 'Main Examination Hall',
        exam_session_id: Date.now()
      }, {
        headers: tokenAuth ? { Authorization: `Bearer ${tokenAuth}` } : {}
      })
      if (res.data?.success) {
        setInvigilateMsg(`Verified invigilator session active: ${res.data.data?.lecturer_name} bound to examination hall.`)
      }
    } catch (err) {
      setInvigilateMsg('Failed: ' + (err.response?.data?.message || err.message))
    } finally {
      setInvigilating(false)
    }
  }

  const permitStatus = data?.data?.permit_status || data?.card?.permit_status
  const isJwtVerified = data?.data?.jwt_verified || data?.card?.jwt_verified

  return (
    <div className="verify-page-wrapper">
      {/* Verification Header Strip */}
      <header className="verify-header-bar">
        <div className="verify-container bar-content">
          <div className="bar-brand">
            <img src="/logo_asset.png" alt="Multitech" className="verify-brand-crest" />
            <div>
              <span className="verify-brand-title">MULTITECH BUSINESS SCHOOL</span>
              <span className="verify-brand-sub">CENTRAL CREDENTIAL VERIFICATION GATEWAY</span>
            </div>
          </div>
          <Link to="/" className="verify-home-link">
            <ArrowLeft size={14} />
            <span>Multitech Home</span>
          </Link>
        </div>
      </header>

      <main className="verify-main-container">
        <div className="verify-container">
          {loading ? (
            <div className="verify-card-box verify-loading-box">
              <div className="loading-spinner" />
              <h3>Verifying Credential Authenticity...</h3>
              <p>Cryptographic token handshake with Multitech central registry.</p>
            </div>
          ) : error ? (
            <div className="verify-card-box verify-error-box">
              <div className="error-icon-wrap">
                <XCircle size={44} />
              </div>
              <h2>Credential Not Verified</h2>
              <p className="error-desc">{error}</p>
              <div className="security-notice">
                <p>If you believe this credential is genuine, please report this incident to the Academic Registrar at <strong>registry@multitech.ac.ug</strong> or visit the Main Campus in Kampala, Uganda.</p>
              </div>
            </div>
          ) : data ? (
            <div className="verify-success-layout">
              {/* Left Column: Verification Badge & Official Confirmation */}
              <div className="verify-status-column">
                <div className={`status-badge-header ${data.card?.is_valid ? 'is-valid' : 'is-invalid'}`}>
                  {data.card?.is_valid ? (
                    <>
                      <ShieldCheck size={32} className="status-shield-icon" />
                      <div>
                        <h2>AUTHENTIC CREDENTIAL VERIFIED</h2>
                        <p>Officially issued and registered by Multitech Business School</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={32} className="status-shield-icon" />
                      <div>
                        <h2>CREDENTIAL {data.card?.status?.toUpperCase()}</h2>
                        <p>{data.message}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Live Permit Status Gate */}
                {permitStatus && (
                  <div className={`verify-permit-gate gate-${permitStatus}`}>
                    <div className="gate-icon-ring">
                      {permitStatus === 'valid' && <ShieldCheck size={28} />}
                      {permitStatus === 'conditional' && <AlertTriangle size={28} />}
                      {permitStatus === 'blocked' && <XCircle size={28} />}
                      {permitStatus === 'expired' && <Clock size={28} />}
                    </div>
                    <div className="gate-text">
                      <h3>
                        {permitStatus === 'valid' && 'Admission Authorized (All Clearances Met)'}
                        {permitStatus === 'conditional' && 'Conditional Admission (Fees Balance Outstanding)'}
                        {permitStatus === 'blocked' && 'Entry Blocked (Card Suspended / Restricted)'}
                        {permitStatus === 'expired' && 'Card Expired (Requires Renewal)'}
                      </h3>
                      <p>
                        {permitStatus === 'valid' && 'Student meets academic, exam, and tuition registration clearance for immediate hall entry.'}
                        {permitStatus === 'conditional' && `Fees balance pending${data.data?.fees_balance ? `: UGX ${Number(data.data.fees_balance).toLocaleString()}` : ''}. Admittance at invigilator discretion.`}
                        {permitStatus === 'blocked' && 'This credential has been flagged or suspended by university administration.'}
                        {permitStatus === 'expired' && 'Validity term has elapsed. Student must present renewed credentials.'}
                      </p>
                    </div>
                    {isJwtVerified && (
                      <div className="gate-jwt-verified" title="Cryptographically verified via HS256 HMAC signature">
                        <ShieldCheck size={13} />
                        <span>HMAC SIGNED &amp; VERIFIED</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Privileged Verifier Mode Alert */}
                {data.is_authorized_verifier && (
                  <div className="privileged-officer-banner">
                    <UserCheck size={18} />
                    <span>Authorized Officer Session: {data.verifier?.name} ({data.verifier?.type?.toUpperCase()})</span>
                  </div>
                )}

                {/* Identity Metadata Card */}
                <div className="credential-meta-card">
                  <div className="meta-card-photo-strip">
                    {data.card?.photo_url || data.data?.photo_url ? (
                      <img
                        src={data.card?.photo_url || data.data?.photo_url}
                        alt={data.card?.cardholder_name || data.data?.cardholder_name}
                        className="meta-photo"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="meta-photo placeholder">
                        {(data.card?.cardholder_name || data.data?.cardholder_name)?.charAt(0) || 'M'}
                      </div>
                    )}
                    <div className="meta-primary-info">
                      <span className={`meta-role-pill role-${data.card?.cardholder_type || data.data?.cardholder_type}`}>
                        {(data.card?.cardholder_type || data.data?.cardholder_type)?.toUpperCase()}
                      </span>
                      <h3>{data.card?.cardholder_name || data.data?.cardholder_name}</h3>
                      <span className="meta-id-number mono-font">
                        {data.card?.identifier_number || data.data?.identifier_number}
                      </span>
                    </div>
                  </div>

                  <div className="meta-grid">
                    <div className="meta-item">
                      <label>CARD NUMBER</label>
                      <span className="mono-font">{data.card?.card_number || data.data?.card_number}</span>
                    </div>
                    <div className="meta-item">
                      <label>PROGRAMME / DEPARTMENT</label>
                      <span>{data.card?.department_or_programme || data.data?.department_or_programme}</span>
                    </div>
                    <div className="meta-item">
                      <label>CAMPUS</label>
                      <span>{data.card?.campus_name || data.data?.campus_name || 'Main Campus'}</span>
                    </div>
                    <div className="meta-item">
                      <label>EXPIRATION DATE</label>
                      <span className="mono-font">
                        {(data.card?.expires_at || data.data?.expires_at) ? new Date(data.card?.expires_at || data.data?.expires_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lecturer Verified Invigilator Session Binding */}
                {(data.card?.cardholder_type === 'lecturer' || data.data?.cardholder_type === 'lecturer') && (
                  <div className="invigilator-binding-card">
                    <div className="invigilator-header">
                      <Award size={18} />
                      <h4>VERIFIED INVIGILATOR SESSION BINDING</h4>
                    </div>
                    <p>Bind this verified faculty card to the active examination hall session to authorize room logs and invigilator remarks.</p>
                    <div className="invigilator-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleStartInvigilatorSession}
                        disabled={invigilating}
                      >
                        <Building size={14} />
                        <span>{invigilating ? 'Binding Invigilator...' : 'Start Invigilator Session (Main Hall)'}</span>
                      </button>
                      {invigilateMsg && <span className="invigilator-msg">{invigilateMsg}</span>}
                    </div>
                  </div>
                )}

                {/* Privileged Student Examination & Fee Clearance */}
                {data.is_authorized_verifier && data.student_clearance && (
                  <div className="privileged-clearance-box">
                    <h4>STUDENT OPERATIONAL CLEARANCE</h4>
                    <div className="clearance-metrics-row">
                      <div className={`clearance-metric-card ${data.student_clearance.is_fees_cleared ? 'cleared' : 'unpaid'}`}>
                        <span className="metric-title">Tuition Clearance</span>
                        <span className="metric-stat">
                          {data.student_clearance.is_fees_cleared ? '100% Cleared' : `${data.student_clearance.percentage_paid}% Paid`}
                        </span>
                        <span className="metric-sub">
                          {data.student_clearance.is_fees_cleared ? 'Zero outstanding balance' : `UGX ${Number(data.student_clearance.balance).toLocaleString()} balance`}
                        </span>
                      </div>

                      <div className={`clearance-metric-card ${data.student_clearance.exam_pass_eligible ? 'cleared' : 'restricted'}`}>
                        <span className="metric-title">Examination Permit</span>
                        <span className="metric-stat">
                          {data.student_clearance.exam_pass_eligible ? 'ADMIT' : 'RESTRICTED'}
                        </span>
                        <span className="metric-sub">
                          {data.student_clearance.exam_pass_eligible ? 'Cleared for hall entry' : 'Payment hold'}
                        </span>
                      </div>

                      {data.student_clearance.active_exam_pin && (
                        <div className="clearance-metric-card pin-card">
                          <span className="metric-title">SEB Exam PIN</span>
                          <span className="metric-stat mono-font">
                            {data.student_clearance.active_exam_pin}
                          </span>
                          <span className="metric-sub">Valid for today&apos;s exam</span>
                        </div>
                      )}
                    </div>

                    {/* 1-Click Admittance Action */}
                    <div className="admit-btn-box">
                      <button
                        className="btn btn-primary btn-lg"
                        onClick={handleAdmit}
                        disabled={admitting}
                      >
                        <UserCheck size={18} />
                        <span>{admitting ? 'Recording Admittance...' : 'Admit into Examination Room'}</span>
                      </button>
                      {admitMessage && (
                        <span className="admit-confirm-text">{admitMessage}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Public Privacy Notice */}
                {!data.is_authorized_verifier && (
                  <div className="public-gate-notice">
                    <Lock size={15} />
                    <span>
                      Financial balances, active examination passcodes, and invigilator controls are restricted to authorized university officers.
                    </span>
                  </div>
                )}
              </div>

              {/* Right Column: 3D Animated Digital Card */}
              <div className="verify-card-column">
                <div className="card-presentation-shell">
                  <div className="presentation-header">
                    <span>DIGITAL CREDENTIAL TWIN</span>
                    <span className="live-seal">LIVE AUTHENTICATED</span>
                  </div>
                  <IdCard3D card={data.card || data.data} showControls={true} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
