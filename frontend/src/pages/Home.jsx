import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import ProgrammeCard from '../components/ProgrammeCard'
import ReasonsCarousel from '../components/ReasonsCarousel'
import './Home.css'

export default function Home() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true })])
  const [heroArticles, setHeroArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [heroLoading, setHeroLoading] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [heroVisible, setHeroVisible] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState([])
  const [reasons, setReasons] = useState([])
  const [reasonsLoading, setReasonsLoading] = useState(true)

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
    const fetchHeroArticles = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/articles/carousel`)
        setHeroArticles(res.data.data || [])
      } catch (err) {
        console.error('Failed to load hero articles', err)
      } finally {
        setHeroLoading(false)
        // Tiny delay so the browser paints the new DOM before starting the transition
        setTimeout(() => setHeroVisible(true), 30)
      }
    }
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/programme-categories`)
        setCategories(res.data.data || [])
      } catch (err) {
        console.error('Failed to load categories', err)
      } finally {
        setLoadingCategories(false)
      }
    }
    const fetchReasons = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/home/reasons`)
        setReasons(res.data.data || [])
      } catch (err) {
        console.error('Failed to load home reasons', err)
      } finally {
        setReasonsLoading(false)
      }
    }
    fetchHeroArticles()
    fetchCategories()
    fetchReasons()
  }, [])

  return (
    <div className="home">
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
          <div className="embla" ref={emblaRef} style={{ overflow: 'hidden', position: 'relative' }}>
            <div className="embla__container" style={{ display: 'flex' }}>
              {heroArticles.map(article => (
                <div className="embla__slide" key={article.id} style={{ flex: '0 0 100%', minWidth: 0, position: 'relative' }}>
                  {/* Full-bleed image */}
                  <div className="carousel-image-wrap">
                    {article.featured_image_url ? (
                      <img className="carousel-img" src={article.featured_image_url} alt={article.title} />
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
                      <Link to={`/articles/${article.id}`} className="button button-accent">Read Article</Link>
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
            <img src="/hero-campus.jpg" alt="Multitech Business School Campus" />
          </div>
        </section>
      )}

      {/* Programmes Overview */}
      <section className="programmes-section">
        <div className="container">
          <h2>Our Programmes</h2>
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

      {/* Why Multitech Reasons Section (dynamic carousel) */}
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
        <section className="about-section">
          <div className="container">
            <h2>Why Multitech Business School?</h2>
            <p className="about-intro">Your gateway to the heart of many businesses</p>
            <p>Multitech Business School provides studies that are a popular choice for students looking to move directly into a professional career as well as those whose ambitions lie in broader ICT and Business Administration.</p>
            <Link to="/apply" className="button button-primary">Start Your Journey</Link>
          </div>
        </section>
      )}
    </div>
  )
}
