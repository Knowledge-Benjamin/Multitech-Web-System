import { useParams, Link } from 'react-router-dom'

import { useApiQuery } from '../hooks/useApiQuery'
import { useScrollFade } from '../hooks/useScrollFade'
import './ProgrammeDetails.css'

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

export default function ProgrammeDetails() {
  const { slug } = useParams()

  const { data: progData, isLoading: loadingProg } = useApiQuery(`/programmes/${slug}`, ['programme', slug])
  const programme = progData?.data || null
  const progId = programme?.id

  const { data: cuData, isLoading: loadingCu } = useApiQuery(
    progId ? `/course-units?programme_id=${progId}` : null,
    ['courseUnits', progId],
    { queryOptions: { enabled: !!progId } }
  )

  const { data: pfData, isLoading: loadingPf } = useApiQuery(
    progId ? `/programme-fees/programme/${progId}` : null,
    ['programmeFees', progId],
    { queryOptions: { enabled: !!progId } }
  )

  const { data: ffData, isLoading: loadingFf } = useApiQuery('/functional-fees', 'functionalFees')

  const courseUnits = cuData?.data || []
  const programmeFees = pfData?.data || []
  const functionalFees = ffData?.data || []

  const loading = loadingProg || (!!progId && (loadingCu || loadingPf || loadingFf))

  useScrollFade()

  if (loading) {
    return <div className="programme-details-page"><div className="container"><p>Loading programme details...</p></div></div>
  }

  if (!programme) {
    return (
      <div className="scope-programmedetails programme-details-page">
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
    if (programme.live_intake_status === 'open') {
      return <span className="status-badge open">Applications Open</span>
    } else if (programme.live_intake_status === 'scheduled') {
      return (
        <span className="status-badge scheduled">
          Opens: {new Date(programme.application_start_date).toLocaleDateString()}
        </span>
      )
    }
    return <span className="status-badge closed">Applications Closed</span>
  }

  // Group Course Units
  const groupedCourseUnits = courseUnits.reduce((acc, cu) => {
    const key = `Year ${cu.target_year} - Semester ${cu.target_semester}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cu);
    return acc;
  }, {});

  // Sort groups by Year then Semester
  const sortedGroupKeys = Object.keys(groupedCourseUnits).sort((a, b) => {
    // Expected format: "Year 1 - Semester 1"
    const aMatch = a.match(/Year (\d+) - Semester (\d+)/);
    const bMatch = b.match(/Year (\d+) - Semester (\d+)/);
    if (!aMatch || !bMatch) return a.localeCompare(b);
    
    if (aMatch[1] !== bMatch[1]) return Number(aMatch[1]) - Number(bMatch[1]);
    return Number(aMatch[2]) - Number(bMatch[2]);
  });

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
          {programme.campuses && programme.campuses.length > 0 && (
            <div className="hero-campuses" style={{ marginTop: '1rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.9, display: 'flex', alignItems: 'center' }}>Available at:</span>
              {programme.campuses.map(campus => (
                <Link key={campus.id} to={`/campuses/${campus.slug}`} className="campus-badge" style={{
                  background: 'rgba(255,255,255,0.15)',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  fontSize: '0.85rem',
                  color: '#fff',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.3)',
                  transition: 'background 0.2s'
                }}>
                  {campus.name}
                </Link>
              ))}
            </div>
          )}
          
          {programme.live_intake_status === 'open' && (
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

          {courseUnits && courseUnits.length > 0 && (
            <section className="detail-section">
              <h2>Curriculum Structure</h2>
              <div className="curriculum-accordion">
                {sortedGroupKeys.map(groupKey => (
                  <div key={groupKey} style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#1e1b4b', borderBottom: '2px solid #e0e7ff', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                      {groupKey}
                    </h3>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {groupedCourseUnits[groupKey].map(cu => (
                        <div key={cu.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                                <span style={{ color: '#4338ca', marginRight: '8px' }}>{cu.course_code}</span>
                                {cu.name}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                Credits: {cu.credits}
                              </div>
                            </div>
                          </div>
                          
                          {cu.modules && cu.modules.length > 0 && (
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                              <strong style={{ fontSize: '0.85rem', color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Modules/Topics Covered:</strong>
                              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#475569' }}>
                                {cu.modules.map((mod, idx) => (
                                  <li key={idx} style={{ marginBottom: '0.25rem' }}>{mod}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
