import { useApiQuery } from '../hooks/useApiQuery'
import ProgrammeCard from '../components/ProgrammeCard'
import '../pages/Programmes.css'

export default function Campuses() {
  const { data: res, isLoading } = useApiQuery('/campuses', 'campuses')
  const campuses = res?.data || []

  return (
    <div className="programmes-page">
      <div className="page-header">
        <h1>Our Campuses</h1>
        <p>Discover our beautiful campus locations</p>
      </div>

      <div className="container">
        {isLoading ? (
          <div className="loading">Loading campuses...</div>
        ) : campuses.length > 0 ? (
          <div className="programmes-list">
            {campuses.map((campus) => (
              <ProgrammeCard
                key={campus.id}
                title={campus.name}
                description={campus.tagline || campus.city || 'Campus Location'}
                imageUrl={campus.featured_image_url}
                actionText="View Campus"
                linkTo={`/campuses/${campus.slug || campus.id}`}
              />
            ))}
          </div>
        ) : (
          <div className="no-results">No campuses found.</div>
        )}
      </div>
    </div>
  )
}
