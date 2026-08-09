import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useApiQuery } from '../hooks/useApiQuery'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import ProgrammeCard from '../components/ProgrammeCard'
import ArticleCard from '../components/ArticleCard'
import SkeletonCard from '../components/SkeletonCard'
import ReasonsCarousel from '../components/ReasonsCarousel'
import ContactForm from '../components/ContactForm'
import LatestArticlesCarousel from '../components/LatestArticlesCarousel'
import Seo from '../components/Seo'
import './Home.css'

export default function Home() {
  const autoplayRef = useRef(null)
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000, stopOnInteraction: true })])
  const [heroVisible, setHeroVisible] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState([])
  const [programmesInView, setProgrammesInView] = useState(false)
  const programmesRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            if (entry.target === programmesRef.current) setProgrammesInView(true);
          } else {
            // Optional: remove class to fade out when scrolling away
            entry.target.classList.remove('is-visible');
            if (entry.target === programmesRef.current) setProgrammesInView(false);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    
    const sections = document.querySelectorAll('.fade-in-section');
    sections.forEach((section) => observer.observe(section));
    
    return () => observer.disconnect();
  }, [])

  const { data: heroRes, isLoading: heroLoading } = useApiQuery('/articles/carousel', 'heroArticles')
  const heroArticles = heroRes?.data || []

  const { data: catRes, isLoading: loadingCategories } = useApiQuery('/programme-categories', 'categories')
  const categories = catRes?.data || []

  const { data: reasonsRes, isLoading: reasonsLoading } = useApiQuery('/home/reasons', 'homeReasons')
  const reasons = reasonsRes?.data || []

  const { data: latestRes, isLoading: latestLoading } = useApiQuery('/articles', 'latestArticles')
  const latestArticles = (latestRes?.data || []).slice(0, 4)

  const { data: campusesRes, isLoading: campusesLoading } = useApiQuery('/campuses', 'campuses')
  const campuses = campusesRes?.data || []

  // Fetch About content for homepage meta description (search engine snippet)
  const { data: aboutRes } = useApiQuery('/about', 'aboutHero')
  const aboutExcerpt = aboutRes?.data?.excerpt || null

  useEffect(() => {
    if (!heroLoading) {
      setTimeout(() => setHeroVisible(true), 30)
    }
  }, [heroLoading])

  const lcpHeroImage = useMemo(() => {
    return heroArticles.find((article) => article?.featured_image_url) || null
  }, [heroArticles])

  const getCategoryLink = (title) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('undergraduate')) return '/programmes?filter=undergraduate';
    if (lowerTitle.includes('postgraduate') || lowerTitle.includes('master')) return '/programmes?filter=postgraduate';
    if (lowerTitle.includes('diploma')) return '/programmes?filter=diploma';
    if (lowerTitle.includes('professional') || lowerTitle.includes('certificate')) return '/programmes?filter=professional';
    if (lowerTitle.includes('short')) return '/programmes?filter=shortcourses';
    return '/programmes';
  }

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi])
  const scrollTo = useCallback((index) => emblaApi && emblaApi.scrollTo(index), [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi, setSelectedIndex])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    setScrollSnaps(emblaApi.scrollSnapList())
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
  }, [emblaApi, setScrollSnaps, onSelect])

  useEffect(() => {
    if (!emblaApi) return
    const autoplay = emblaApi.plugins()?.autoplay
    if (!autoplay) return
    autoplayRef.current = autoplay
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi || !autoplayRef.current) return

    const handleMouseEnter = () => autoplayRef.current.stop()
    const handleMouseLeave = () => autoplayRef.current.play()

    const carousel = emblaRef?.current
    if (carousel) {
      carousel.addEventListener('mouseenter', handleMouseEnter)
      carousel.addEventListener('mouseleave', handleMouseLeave)
    }

    return () => {
      if (carousel) {
        carousel.removeEventListener('mouseenter', handleMouseEnter)
        carousel.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [emblaApi])



  return (
    <div className="scope-home home">
      <Seo
        title="Multitech Business School"
        description={aboutExcerpt || 'Discover academic programmes, admissions, and student opportunities at Multitech Business School in Uganda.'}
        path="/"
        keywords={['higher education', 'business school', 'Uganda', 'admissions']}
      />
      {lcpHeroImage?.featured_image_url && (
        <link rel="preload" as="image" href={lcpHeroImage.featured_image_url} fetchpriority="high" />
      )}
      {/* Hero Banner — wait for data before rendering */}
      {heroLoading ? (
        <section className="hero-skeleton">
          <div className="hero-skeleton-shimmer" />
          <div className="hero-skeleton-content">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-subtitle" />
            <div className="skeleton-line skeleton-subtitle short" />
            <div className="skeleton-btn" />
          </div>
        </section>
      ) : heroArticles.length > 0 ? (
        <section className={`hero-carousel-container ${heroVisible ? 'hero-carousel-visible' : ''}`} style={{ position: 'relative' }}>
          <div className="embla" ref={emblaRef} style={{ overflow: 'hidden', position: 'relative', height: '100%' }}>
            <div className="embla__container" style={{ display: 'flex', height: '100%' }}>
              {heroArticles.map((article, index) => (
                <div className="embla__slide" key={article.id} style={{ flex: '0 0 100%', minWidth: 0, position: 'relative', height: '100%' }}>
                  {/* Full-bleed image */}
                  <div className="carousel-image-wrap">
                    {article.featured_image_url ? (
                      <img
                        className="carousel-img"
                        src={article.featured_image_url}
                        alt={article.title}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        fetchpriority={index === 0 ? 'high' : 'low'}
                      />
                    ) : (
                      <div className="carousel-img" style={{ backgroundColor: '#003366' }} />
                    )}
                    {/* Cinematic bottom gradient */}
                    <div className="carousel-gradient-overlay" />
                  </div>

                  {/* Text anchored bottom-left inside the gradient */}
                  <div className="carousel-content">
                    <h1 className="carousel-title">{article.title}</h1>
                    <p className="carousel-excerpt">{article.excerpt}</p>
                    <div className="carousel-actions">
                      <Link to={`/articles/${article.slug || article.id}`} className="button button-accent">Read Article</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="carousel-arrow carousel-prev" onClick={scrollPrev}>&#10094;</button>
          <button className="carousel-arrow carousel-next" onClick={scrollNext}>&#10095;</button>

          {scrollSnaps.length > 1 && (
            <div className="carousel-dots">
              {scrollSnaps.map((_, index) => (
                <button
                  key={index}
                  className={`carousel-dot ${index === selectedIndex ? 'is-selected' : ''}`}
                  onClick={() => scrollTo(index)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        /* No pinned articles — show static fallback */
        <section className="hero">
          <div className="hero-content">
            <h1>Welcome to Multitech Business School</h1>
            <p>Any successful career starts with advanced higher education. At our university, you will have a deeper knowledge of the subjects that will be particularly useful when climbing the career ladder.</p>
            <div className="hero-buttons">
              <Link to="/programmes" className="button button-accent">Our Programmes</Link>
              <Link to="/apply" className="button button-secondary">Explore MBS</Link>
            </div>
          </div>
          <div className="hero-image">
            <img src="/hero-campus.jpg" alt="Multitech Business School Campus" loading="eager" decoding="async" fetchpriority="high" />
          </div>
        </section>
      )}

      {/* Programmes Overview */}
      <section className="programmes-section fade-in-section" ref={programmesRef}>
        <div className="container">
          <h2 className="section-title">Our Programmes</h2>
          <div className="programmes-grid">
            {loadingCategories ? (
              <p>Loading programmes...</p>
            ) : categories.length > 0 ? (
              categories.map((cat, index) => (
                <ProgrammeCard 
                  key={cat.id} 
                  title={cat.title} 
                  imageUrl={cat.image_url} 
                  linkTo={getCategoryLink(cat.title)} 
                />
              ))
            ) : (
              <p>No programmes available.</p>
            )}
          </div>
        </div>
      </section>

      {/* Our Campuses */}
      <section className="campuses-section fade-in-section" style={{ background: '#f8f9fa', padding: '4rem 0' }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '2rem', color: '#1a1a1a', fontSize: '2.5rem' }}>Our Campuses</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {campusesLoading ? (
              <p style={{ textAlign: 'center', width: '100%' }}>Loading campuses...</p>
            ) : campuses.length > 0 ? (
              campuses.map(campus => (
                <div key={campus.id} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'transform 0.3s ease' }}>
                  {campus.featured_image_url && (
                    <img 
                      src={campus.featured_image_url} 
                      alt={campus.name} 
                      style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                    />
                  )}
                  <div style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#003366', fontSize: '1.4rem' }}>{campus.name}</h3>
                    <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {campus.description || 'Discover our state-of-the-art facilities and vibrant student community at this campus.'}
                    </p>
                    <Link to={`/campuses/${campus.slug}`} className="button button-secondary" style={{ width: '100%', textAlign: 'center' }}>
                      Explore Campus
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', width: '100%', color: '#666' }}>No campuses available.</p>
            )}
          </div>
        </div>
      </section>

      {/* Why Multitech Reasons Section (dynamic carousel) */}
      <section className="reasons-section fade-in-section">
        <div className="reasons-header">
          <div className="container">
            <h2 className="section-title">Why Multitech Business School?</h2>
            <p className="about-intro">Built for ambitious students seeking practical business education.</p>
          </div>
        </div>

        {reasonsLoading ? (
          <section className="hero-skeleton">
            <div className="hero-skeleton-shimmer" />
            <div className="hero-skeleton-content">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-subtitle" />
              <div className="skeleton-line skeleton-subtitle short" />
              <div className="skeleton-btn" />
            </div>
          </section>
        ) : reasons.length > 0 ? (
          <ReasonsCarousel reasons={reasons} />
        ) : (
          <div className="reasons-empty">
            <div className="container">
              <p>No reasons have been published yet. Please check back soon.</p>
            </div>
          </div>
        )}
      </section>

      <section className="latest-articles-section fade-in-section">
        <div className="latest-articles-container">
          <div className="latest-articles-copy">
            <span className="section-label">Latest News & Articles</span>
            <h2 className="section-title">Stay up to date</h2>
          </div>

          {latestLoading ? (
            <div className="latest-articles-grid">
              {Array.from({ length: 4 }).map((_, idx) => <SkeletonCard key={`latest-skeleton-${idx}`} />)}
            </div>
          ) : latestArticles.length > 0 ? (
            <>
              <div className="latest-articles-grid latest-articles-grid--desktop">
                {latestArticles.map(article => <ArticleCard key={article.id} article={article} />)}
              </div>
              <LatestArticlesCarousel articles={latestArticles} />
            </>
          ) : (
            <p className="latest-empty">No recent articles available yet.</p>
          )}

          <div className="latest-articles-action">
            <Link to="/articles" className="button button-secondary">Explore more articles</Link>
          </div>
        </div>
      </section>

      <section className="home-contact-section fade-in-section">
        <div className="container home-contact-inner">
          <div className="home-contact-copy">
            <span className="section-label">Contact Us</span>
            <h2 className="section-title">Have a question? Reach out to our team.</h2>
            <p>Send us your inquiry and our admissions team will reply as soon as possible.</p>
          </div>
          <ContactForm pageUrl="/" />
        </div>
      </section>
    </div>
  )
}
