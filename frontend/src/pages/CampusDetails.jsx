import { useParams, Link } from 'react-router-dom'
import { useApiQuery } from '../hooks/useApiQuery'
import ProgrammeCard from '../components/ProgrammeCard'
import '../pages/ProgrammeDetails.css'

export default function CampusDetails() {
  const { slug } = useParams()

  const { data: res, isLoading } = useApiQuery(`/campuses/${slug}`, ['campus', slug])
  const campus = res?.data || null
  const programmes = campus?.programmes || []

  if (isLoading) {
    return (
      <div className="programme-details-page">
        <div className="container"><p>Loading campus details...</p></div>
      </div>
    )
  }

  if (!campus) {
    return (
      <div className="programme-details-page">
        <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <h2>Campus Not Found</h2>
          <p style={{ marginBottom: '2rem' }}>We could not find the campus you are looking for.</p>
          <Link to="/campuses" className="button button-primary">Back to Campuses</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="programme-details-page">
      {/* Hero Section */}
      <div className="programme-hero" style={{ backgroundImage: `url(${campus.featured_image_url || ''})` }}>
        <div className="hero-overlay"></div>
        <div className="container hero-content">
          <div className="hero-tags">
            <span className="type-tag">Campus</span>
          </div>
          <h1>{campus.name}</h1>
          <div className="hero-meta">
            {campus.city && <span><i className="icon-location"></i> {campus.city}</span>}
            {campus.phone && <span><i className="icon-phone"></i> {campus.phone}</span>}
          </div>
        </div>
      </div>

      <div className="container details-container">
        <div className="details-main" style={{ width: '100%' }}>
          {campus.description && (
            <section className="detail-section">
              <h2>About this Campus</h2>
              <p style={{ whiteSpace: 'pre-wrap' }}>{campus.description}</p>
            </section>
          )}

          {campus.address && (
            <section className="detail-section">
              <h2>Location & Address</h2>
              <p>{campus.address}</p>
              {campus.map_embed_url && (
                <div className="map-embed" style={{ marginTop: '1rem' }}>
                  <iframe 
                    src={campus.map_embed_url} 
                    width="100%" 
                    height="400" 
                    style={{ border: 0, borderRadius: '12px' }} 
                    allowFullScreen="" 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              )}
            </section>
          )}

          <section className="detail-section">
            <h2>Programmes Offered Here</h2>
            {programmes.length > 0 ? (
              <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', marginTop: '1.5rem' }}>
                {programmes.map(prog => (
                  <ProgrammeCard
                    key={prog.id}
                    title={prog.name}
                    description={prog.description}
                    imageUrl={prog.image_url}
                    actionText="View Details"
                    linkTo={`/programmes/${prog.slug || prog.id}`}
                  />
                ))}
              </div>
            ) : (
              <p>No programmes listed for this campus yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
