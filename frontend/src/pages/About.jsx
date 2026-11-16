import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import { useScrollFade } from '../hooks/useScrollFade'
import './About.css'
import Seo from '../components/Seo'

export default function About() {
  const [visible, setVisible] = useState(false)
  const [activeSection, setActiveSection] = useState(null)
  const [expandedMain, setExpandedMain] = useState(false)

  const { data: heroRes, isLoading: heroLoading } = useApiQuery('/about', 'aboutHero')
  const hero = heroRes?.data || null

  const { data: sectionsRes, isLoading: sectionsLoading } = useApiQuery('/about/sections', 'aboutSections')
  const sections = sectionsRes?.data || []

  const loading = heroLoading || sectionsLoading

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setVisible(true), 30)
      return () => clearTimeout(timer)
    }
  }, [loading])

  useEffect(() => {
    if (sections.length > 0 && !sections.some(section => section.id === activeSection)) {
      setActiveSection(sections[0].id)
    }
  }, [sections, activeSection])

  useScrollFade(0.1, '0px 0px -50px 0px', [loading, Boolean(hero?.content), sections.length])

  const currentSection = sections.find(section => section.id === activeSection) || sections[0] || null

  return (
    <div className="scope-about about-page">
      <Seo
        title="About Multitech Business School"
        description="Discover Multitech Business School's story, approach to learning, and the people behind our community."
        path="/about"
        keywords={['about multitech', 'multitech business school', 'education in Uganda']}
      />
      {loading ? (
        <section className="about-hero-skeleton" aria-label="Loading About page">
          <div className="about-skeleton-content">
            <div className="about-skeleton-line about-skeleton-kicker" />
            <div className="about-skeleton-line about-skeleton-title" />
            <div className="about-skeleton-line about-skeleton-copy" />
            <div className="about-skeleton-line about-skeleton-button" />
          </div>
        </section>
      ) : (
        <section className={`about-hero${visible ? ' is-visible' : ''}`}>
          {hero?.featured_image_url ? (
            <div className="about-hero-image-wrap">
              <img
                className="about-hero-image"
                src={hero.featured_image_url}
                alt=""
                loading="eager"
                decoding="async"
                fetchpriority="high"
              />
            </div>
          ) : null}
          <div className="about-hero-overlay" />
          <div className="about-hero-content">
            <span className="about-eyebrow about-hero-eyebrow">About Multitech</span>
            <h1>{hero?.title || 'A school for your next chapter'}</h1>
            <p>{hero?.excerpt || 'Discover our story, our approach to learning, and the people who make up the Multitech community.'}</p>
            <div className="about-hero-actions">
              <a href={hero?.content ? '#about-story' : '#about-details'} className="button button-accent">
                Explore our story
                <ArrowDown size={16} aria-hidden="true" />
              </a>
              <Link to="/programmes" className="button button-outline about-hero-secondary">
                Browse programmes
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {hero?.content && (
        <section className="about-story-section" id="about-story">
          <div className="about-story-inner fade-in-section">
            <div className="about-section-heading">
              <span className="about-eyebrow">Our story</span>
              <h2>About <em>Multitech</em></h2>
            </div>
            <div
              id="about-story-copy"
              className={`about-story-copy rich-text${expandedMain ? '' : ' is-collapsed'}`}
              dangerouslySetInnerHTML={{ __html: hero.content.replace(/\n/g, '<br/>') }}
            />
            <button
              type="button"
              onClick={() => setExpandedMain(!expandedMain)}
              className="about-read-toggle"
              aria-expanded={expandedMain}
              aria-controls="about-story-copy"
            >
              {expandedMain ? 'Read less' : 'Continue reading'}
            </button>
          </div>
        </section>
      )}

      <section className="about-details-section" id="about-details">
        <div className="about-section-intro fade-in-section">
          <span className="about-eyebrow">Discover Multitech</span>
          <h2>Get to know <em>our school</em></h2>
          <p>Choose a topic to explore our community, learning approach, and leadership.</p>
        </div>
        {sections.length > 0 ? (
          <div className="about-details-grid">
            <nav className="about-nav-card fade-in-section" aria-labelledby="about-navigation-title">
              <h3 id="about-navigation-title">On this page</h3>
              <div className="about-nav-items" role="group" aria-label="About Multitech topics">
                {sections.map((section, index) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`about-nav-item ${activeSection === section.id ? 'selected' : ''}`}
                    onClick={() => setActiveSection(section.id)}
                    aria-pressed={activeSection === section.id}
                    aria-controls="about-content-panel"
                  >
                    <span className="about-nav-index" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="about-nav-item-label">
                      <span>{section.title}</span>
                      {section.description && <small>{section.description}</small>}
                    </span>
                  </button>
                ))}
              </div>
            </nav>

            <div className="about-content-panel fade-in-section" id="about-content-panel" role="region" aria-live="polite" aria-labelledby="about-content-title">
              <h3 id="about-content-title">{currentSection?.title || 'About Our School'}</h3>
              {currentSection?.content ? (
                <div
                  className="rich-text"
                  dangerouslySetInnerHTML={{ __html: currentSection.content.replace(/\n/g, '<br/>') }}
                />
              ) : (
                <p>Our about page is being updated with new sections. Please check back soon.</p>
              )}
              {currentSection?.section_type === 'staff' && (
                <div className="about-staff-grid">
                  {((currentSection.metadata && currentSection.metadata.staff_members) || []).map((m, i) => (
                    <article key={`${m.name}-${i}`} className="about-staff-card">
                      <div className="about-staff-avatar">
                        {m.image_url ? (
                          <img src={m.image_url} alt={m.name} loading="lazy" decoding="async" />
                        ) : (
                          <span>{m.name?.trim().split(/\s+/).map(name => name[0]).join('').slice(0, 2)}</span>
                        )}
                      </div>
                      <h4>{m.name}</h4>
                      {m.role && <span className="about-staff-role">{m.role}</span>}
                      {m.bio && <p>{m.bio}</p>}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="about-details-empty fade-in-section">
            <h3>No About sections available</h3>
            <p>Our school information is being updated. Please check back soon.</p>
          </div>
        )}
      </section>
    </div>
  )
}
