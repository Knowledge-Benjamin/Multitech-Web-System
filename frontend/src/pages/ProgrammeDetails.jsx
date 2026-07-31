import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import './ProgrammeDetails.css'

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

export default function ProgrammeDetails() {
  const { slug } = useParams()
  const [programme, setProgramme] = useState(null)
  const [programmeFees, setProgrammeFees] = useState([])
  const [functionalFees, setFunctionalFees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const progRes = await axios.get(`${import.meta.env.VITE_API_URL}/programmes/${slug}`)
        setProgramme(progRes.data.data)

        const customFeesRes = await axios.get(`${import.meta.env.VITE_API_URL}/programme-fees/programme/${progRes.data.data?.id}`)
        setProgrammeFees(customFeesRes.data.data || [])

        const funcFeesRes = await axios.get(`${import.meta.env.VITE_API_URL}/functional-fees`)
        setFunctionalFees(funcFeesRes.data.data || [])
      } catch (err) {
        console.error('Failed to fetch programme details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [slug])

  if (loading) {
    return <div className="programme-details-page"><div className="container"><p>Loading programme details...</p></div></div>
  }

  if (!programme) {
    return (
      <div className="programme-details-page">
        <div className="container">
          <h2>Programme Not Found</h2>
          <p>We could not find the programme you are looking for.</p>
          <Link to="/programmes" className="button button-secondary">Back to Programmes</Link>
        </div>
      </div>
    )
  }

  // Calculate fees
  const activeFuncFees = functionalFees.filter(f => f.active)
  const activeCustomFees = programmeFees.filter(f => f.active)

  const localFuncTotal = activeFuncFees.reduce((sum, f) => sum + parseFloat(f.national_amount), 0)
  const intlFuncTotal = activeFuncFees.reduce((sum, f) => sum + parseFloat(f.international_amount), 0)
  
  const customTotalLocal = activeCustomFees.reduce((sum, f) => sum + parseFloat(f.national_amount), 0)
  const customTotalIntl = activeCustomFees.reduce((sum, f) => sum + parseFloat(f.international_amount), 0)

  const totalLocal = (parseFloat(programme.national_tuition_fee) || 0) + localFuncTotal + customTotalLocal
  const totalIntl = (parseFloat(programme.international_tuition_fee) || 0) + intlFuncTotal + customTotalIntl

  const renderStatusBadge = () => {
    if (programme.intake_status === 'open') {
      return <span className="status-badge open">Applications Open</span>
    } else if (programme.intake_status === 'scheduled') {
      return (
        <span className="status-badge scheduled">
          Opens: {new Date(programme.application_start_date).toLocaleDateString()}
        </span>
      )
    }
    return <span className="status-badge closed">Applications Closed</span>
  }

  return (
    <div className="programme-details-page">
      {/* Hero Section */}
      <div className="programme-hero" style={{ backgroundImage: `url(${programme.image_url || ''})` }}>
        <div className="hero-overlay"></div>
        <div className="container hero-content">
          <div className="hero-tags">
            <span className="type-tag">{programme.type}</span>
            <span className="level-tag">{programme.level}</span>
          </div>
          <h1>{programme.name}</h1>
          <div className="hero-meta">
            <span><i className="icon-clock"></i> Duration: {programme.duration}</span>
            {renderStatusBadge()}
          </div>
          
          {programme.intake_status === 'open' && (
            <Link to={`/apply?programme=${programme.id}`} className="button button-accent apply-btn">Apply Now</Link>
          )}
        </div>
      </div>

      <div className="container details-container">
        <div className="details-main">
          <section className="detail-section">
            <h2>Overview</h2>
            <p>{programme.description}</p>
          </section>

          {programme.requirements && (
            <section className="detail-section">
              <h2>Admission Requirements</h2>
              <div className="rich-text" dangerouslySetInnerHTML={{ __html: programme.requirements.replace(/\n/g, '<br/>') }} />
            </section>
          )}

          {programme.career_prospects && (
            <section className="detail-section">
              <h2>Career Prospects</h2>
              <div className="rich-text" dangerouslySetInnerHTML={{ __html: programme.career_prospects.replace(/\n/g, '<br/>') }} />
            </section>
          )}

          {programme.curriculum && programme.curriculum.length > 0 && (
            <section className="detail-section">
              <h2>Curriculum Summary</h2>
              <ul className="curriculum-list">
                {programme.curriculum.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="details-sidebar">
          <div className="sidebar-card fee-structure">
            <h3>Fee Structure</h3>
            
            <div className="fee-group">
              <h4>National Students (UGX)</h4>
              <div className="fee-row">
                <span>Tuition</span>
                <span>{(parseFloat(programme.national_tuition_fee) || 0).toLocaleString()}</span>
              </div>
              {activeFuncFees.map(f => (
                <div className="fee-row" key={`func-nat-${f.id}`}>
                  <span>{f.fee_name}</span>
                  <span>{(parseFloat(f.national_amount) || 0).toLocaleString()}</span>
                </div>
              ))}
              {activeCustomFees.map(f => (
                <div className="fee-row" key={`cust-nat-${f.id}`}>
                  <span>{f.fee_name}</span>
                  <span>{(parseFloat(f.national_amount) || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="fee-row sub-total" style={{ borderTop: '2px solid #eee', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <span>Total National Fees</span>
                <strong>UGX {totalLocal.toLocaleString()}</strong>
              </div>
            </div>

            <div className="fee-group" style={{ marginTop: '2rem' }}>
              <h4>International Students (USD)</h4>
              <div className="fee-row">
                <span>Tuition</span>
                <span>$ {(parseFloat(programme.international_tuition_fee) || 0).toLocaleString()}</span>
              </div>
              {activeFuncFees.map(f => (
                <div className="fee-row" key={`func-intl-${f.id}`}>
                  <span>{f.fee_name}</span>
                  <span>$ {(parseFloat(f.international_amount) || 0).toLocaleString()}</span>
                </div>
              ))}
              {activeCustomFees.map(f => (
                <div className="fee-row" key={`cust-intl-${f.id}`}>
                  <span>{f.fee_name}</span>
                  <span>$ {(parseFloat(f.international_amount) || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="fee-row sub-total" style={{ borderTop: '2px solid #eee', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <span>Total International Fees</span>
                <strong>$ {totalIntl.toLocaleString()}</strong>
              </div>
            </div>
          </div>
          
          <div className="sidebar-card assistance">
            <h3>Need Help?</h3>
            <p>If you have questions about the application process or fees, our admissions team is here to help.</p>
            <a href="mailto:admissions@multitech.ac.ug" className="button button-outline">Contact Admissions</a>
          </div>
        </aside>
      </div>
    </div>
  )
}
