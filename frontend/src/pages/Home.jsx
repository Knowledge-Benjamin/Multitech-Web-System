import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
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
  const [contactImageIndex, setContactImageIndex] = useState(0)
  const [contactImagePaused, setContactImagePaused] = useState(false)
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
  const contactImages = [...latestArticles, ...heroArticles]
    .filter((article, index, articles) => (
      article?.featured_image_url
      && articles.findIndex((candidate) => candidate.featured_image_url === article.featured_image_url) === index
    ))
    .slice(0, 5)

  useEffect(() => {
    if (contactImages.length < 2 || contactImagePaused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = setInterval(() => {
      setContactImageIndex((current) => (current + 1) % contactImages.length)
    }, 6500)
    return () => clearInterval(timer)
  }, [contactImages.length, contactImagePaused])

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
          <div className="home-section-heading home-section-heading--center">
            <span className="home-section-eyebrow">Study at Multitech</span>
            <h2 className="section-title home-section-title">Our <em>Programmes</em></h2>
          </div>
          <div className="programmes-grid">
            {loadingCategories ? (
              <p>Loading programmes...</p>
            ) : categories.length > 0 ? (
              categories.map((cat, index) => (
                <ProgrammeCard 
                  key={cat.id} 
                  variant="catalog"
                  title={cat.title} 
                  imageUrl={cat.image_url} 
                  eyebrow="Study area"
                  actionText="Explore programmes"
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
      <section className="campuses-section fade-in-section">
        <div className="container">
          <div className="home-section-heading home-section-heading--center">
            <span className="home-section-eyebrow">A place to grow</span>
            <h2 className="section-title home-section-title">Our <em>Campuses</em></h2>
          </div>
          <div className="campuses-grid">
            {campusesLoading ? (
              <p className="campuses-empty">Loading campuses...</p>
            ) : campuses.length > 0 ? (
              campuses.map((campus, index) => (
                <article key={campus.id} className="home-campus-card">
                  {campus.featured_image_url && (
                    <div className="home-campus-image-wrap">
                      <img
                        src={campus.featured_image_url}
                        alt={campus.name}
                        className="home-campus-image"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                  <div className="home-campus-content">
                    <span className="home-campus-index" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3>{campus.name}</h3>
                    <p>
                      {campus.description || 'Discover our state-of-the-art facilities and vibrant student community at this campus.'}
                    </p>
                    <Link to={`/campuses/${campus.slug}`} className="home-campus-link">
                      <span>Explore campus</span>
                      <ArrowUpRight className="home-campus-link-arrow" size={17} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <p className="campuses-empty">No campuses available.</p>
            )}
          </div>
        </div>
      </section>

      {/* Why Multitech Reasons */}
      <section className="reasons-section fade-in-section">
        <div className="reasons-header">
          <div className="container">
            <span className="reasons-eyebrow">The Multitech difference</span>
            <h2 className="section-title reasons-heading">
              Why Multitech <em>Business School?</em>
            </h2>
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
            <span className="home-section-eyebrow">Latest news &amp; articles</span>
            <h2 className="section-title home-section-title">Stay up to <em>date</em></h2>
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
          <div className="home-contact-form-column">
            <div className="home-contact-copy">
              <span className="home-section-eyebrow">Contact us</span>
              <h2 className="section-title home-section-title">Have a question? <em>Reach out</em> to our team.</h2>
              <p>Send us a message. We’ll be glad to help.</p>
            </div>
            <ContactForm pageUrl="/" />
          </div>
          <div
            className="home-contact-image-panel"
            aria-hidden="true"
            onMouseEnter={() => setContactImagePaused(true)}
            onMouseLeave={() => setContactImagePaused(false)}
          >
            <div className="home-contact-image-stack">
              {contactImages.map((article, index) => (
                <img
                  key={article.id || article.featured_image_url}
                  className={`home-contact-image${index === contactImageIndex % contactImages.length ? ' is-active' : ''}`}
                  src={article.featured_image_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
            <div className="home-contact-image-wash" />
            <div className="home-contact-image-caption">
              <span>Multitech Business School</span>
              <p>Let’s start a conversation.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
