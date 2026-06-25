import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './Home.css'
import './About.css'

export default function About() {
  const [hero, setHero] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [activeSection, setActiveSection] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [heroRes, sectionsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/about`),
          axios.get(`${import.meta.env.VITE_API_URL}/about/sections`)
        ])

        setHero(heroRes.data.data)
        setSections(sectionsRes.data.data || [])
        setActiveSection(sectionsRes.data.data?.[0]?.id || null)
      } catch (err) {
        console.error('Failed to load About page data', err)
      } finally {
        setLoading(false)
        setTimeout(() => setVisible(true), 30)
      }
    }

    fetchData()
  }, [])

  const currentSection = sections.find(section => section.id === activeSection) || sections[0] || null

  return (
    <div className="about-page">
      {loading ? (
        <section className="hero-skeleton">
          <div className="hero-skeleton-shimmer" />
          <div className="hero-skeleton-content">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-subtitle" />
            <div className="skeleton-line skeleton-subtitle short" />
            <div className="skeleton-btn" />
          </div>
        </section>
      ) : hero ? (
        <section className={`hero-carousel-container ${visible ? 'hero-carousel-visible' : ''}`} style={{ position: 'relative' }}>
          <div className="carousel-image-wrap">
            {hero.featured_image_url ? (
              <img className="carousel-img" src={hero.featured_image_url} alt={hero.title} />
            ) : (
              <div className="carousel-img" style={{ backgroundColor: '#003366' }} />
            )}
            <div className="carousel-gradient-overlay" style={{ background: 'linear-gradient(180deg, rgba(0,58,122,0.15) 0%, rgba(0,58,122,0.75) 100%)' }} />
          </div>

          <div className="carousel-content">
            <h1 className="carousel-title">{hero.title}</h1>
            <p className="carousel-excerpt">{hero.excerpt}</p>
            <div className="carousel-actions">
              <Link to="/apply" className="button button-accent">Apply Now</Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="hero">
          <div className="hero-content">
            <h1>About Multitech Business School</h1>
            <p>Learn more about our mission, values and programmes.</p>
          </div>
        </section>
      )}

      <section className="about-details-section">
        {sections.length > 0 ? (
          <div className="about-details-grid">
            <div className="about-nav-card">
              <h3>Learn More</h3>
              <div className="about-nav-items">
                {sections.map(section => (
                  <button
                    key={section.id}
                    type="button"
                    className={`about-nav-item ${activeSection === section.id ? 'selected' : ''}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <span className="about-nav-radio" />
                    <span className="about-nav-item-label">
                      <span>{section.title}</span>
                      <small>{section.description}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="about-content-panel">
              <h3>{currentSection?.title || 'About Our School'}</h3>
              <p>{currentSection?.content || 'Our about page is being updated with new sections. Please check back soon.'}</p>
              {currentSection?.section_type === 'staff' && (
                <div className="staff-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  {((currentSection.metadata && currentSection.metadata.staff_members) || []).map((m, i) => (
                    <div key={i} className="staff-card" style={{ border: '1px solid #eee', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ width: 120, height: 120, margin: '0 auto', overflow: 'hidden', borderRadius: '50%', background: '#f4f4f4' }}>
                        {m.image_url ? (
                          <img src={m.image_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>{m.name?.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
                        )}
                      </div>
                      <h4 style={{ margin: '0.5rem 0 0.25rem' }}>{m.name}</h4>
                      {m.role && <small style={{ display: 'block', color: '#666' }}>{m.role}</small>}
                      {m.bio && <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#444' }}>{m.bio}</p>}
                    </div>
                  ))}
                </div>
              )}
              {currentSection?.slug === 'governance' && (
                <ul>
                  <li>Board oversight ensures quality and compliance.</li>
                  <li>Transparent policy governance across all programmes.</li>
                  <li>Regular performance reviews and strategic planning.</li>
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="about-details-empty">
            <h3>No About sections available</h3>
            <p>Admin content for the About page is not published yet. Please check back later.</p>
          </div>
        )}
      </section>

      {/* Empty viewport-height spacer as requested */}
      <div style={{ minHeight: '100vh' }} />

      <section className="container about-copy">
        <h2>Our Story</h2>
        <p>Multitech Business School is dedicated to providing industry-focused education, equipping students with practical skills and foundational theory necessary for a successful career.</p>
      </section>
    </div>
  )
}
