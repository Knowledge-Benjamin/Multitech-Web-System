import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import ProgrammeCard from '../components/ProgrammeCard'
import './Programmes.css'

export default function Programmes() {
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(null)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  
  const [searchParams, setSearchParams] = useSearchParams()
  const initialFilter = searchParams.get('filter') || 'all'
  const [filter, setFilter] = useState(initialFilter)

  useEffect(() => {
    fetchProgrammes()
  }, [])

  useEffect(() => {
    const queryFilter = searchParams.get('filter')
    if (queryFilter) {
      setFilter(queryFilter)
    }
  }, [searchParams])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setActiveIndex(0)
  }, [filter, programmes.length])

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
    if (newFilter === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ filter: newFilter })
    }
  }

  const fetchProgrammes = async () => {
    try {
      const response = await fetch('/api/programmes')
      const result = await response.json()
      setProgrammes(result.data || [])
    } catch (error) {
      console.error('Failed to fetch programmes:', error)
      // Mock data for now
      setProgrammes([
        {
          id: 1,
          name: 'Bachelor of Business Administration',
          type: 'undergraduate',
          description: 'Comprehensive business education with focus on management and entrepreneurship',
          duration: '3 years'
        },
        {
          id: 2,
          name: 'Master of Business Administration',
          type: 'postgraduate',
          description: 'Advanced business studies for professionals seeking career advancement',
          duration: '2 years'
        },
        {
          id: 3,
          name: 'Diploma in Information Technology',
          type: 'diploma',
          description: 'Practical IT skills and systems development',
          duration: '2 years'
        },
        {
          id: 4,
          name: 'Professional Accounting Certification',
          type: 'professional',
          description: 'Industry-recognized accounting and finance certification',
          duration: '1 year'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const filteredProgrammes = filter === 'all' ? programmes : programmes.filter(p => p.type === filter)

  const showPreviousCard = () => {
    if (filteredProgrammes.length <= 1) return
    setActiveIndex((prev) => (prev === 0 ? filteredProgrammes.length - 1 : prev - 1))
  }

  const showNextCard = () => {
    if (filteredProgrammes.length <= 1) return
    setActiveIndex((prev) => (prev === filteredProgrammes.length - 1 ? 0 : prev + 1))
  }

  const shuffleCard = () => {
    if (filteredProgrammes.length <= 1) return
    let nextIndex = Math.floor(Math.random() * filteredProgrammes.length)
    while (nextIndex === activeIndex) {
      nextIndex = Math.floor(Math.random() * filteredProgrammes.length)
    }
    setActiveIndex(nextIndex)
  }

  const handleTouchStart = (event) => {
    setTouchStartX(event.touches[0].clientX)
  }

  const handleTouchEnd = (event) => {
    if (touchStartX === null) return
    const touchEndX = event.changedTouches[0].clientX
    const delta = touchEndX - touchStartX

    if (delta > 50) {
      showPreviousCard()
    } else if (delta < -50) {
      showNextCard()
    }

    setTouchStartX(null)
  }

  const renderProgrammeCard = (programme, index) => (
    <ProgrammeCard 
      key={programme.id || index} 
      title={programme.name} 
      description={programme.description}
      imageUrl={programme.image_url} 
      actionText="View Details"
      linkTo={`/programmes/${programme.id}`}
    />
  )

  return (
    <div className="programmes-page">
      <div className="page-header">
        <h1>Our Programmes</h1>
        <p>Explore our wide range of educational offerings</p>
      </div>

      <div className="container">
        <div className="filter-section">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All Programmes
          </button>
          <button
            className={`filter-btn ${filter === 'undergraduate' ? 'active' : ''}`}
            onClick={() => handleFilterChange('undergraduate')}
          >
            Undergraduate
          </button>
          <button
            className={`filter-btn ${filter === 'postgraduate' ? 'active' : ''}`}
            onClick={() => handleFilterChange('postgraduate')}
          >
            Postgraduate
          </button>
          <button
            className={`filter-btn ${filter === 'diploma' ? 'active' : ''}`}
            onClick={() => handleFilterChange('diploma')}
          >
            Diploma
          </button>
          <button
            className={`filter-btn ${filter === 'professional' ? 'active' : ''}`}
            onClick={() => handleFilterChange('professional')}
          >
            Professional
          </button>
          <button
            className={`filter-btn ${filter === 'shortcourses' ? 'active' : ''}`}
            onClick={() => handleFilterChange('shortcourses')}
          >
            Short Courses
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading programmes...</div>
        ) : filteredProgrammes.length > 0 ? (
          isMobile && filteredProgrammes.length > 1 ? (
            <div className="programmes-mobile-deck" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <div className="programmes-mobile-hint">Swipe or tap to shuffle through programmes</div>
              <div className="programmes-mobile-counter">{activeIndex + 1} / {filteredProgrammes.length}</div>
              <div className="programmes-mobile-card">
                {renderProgrammeCard(filteredProgrammes[activeIndex], activeIndex)}
              </div>
              <div className="programmes-mobile-actions">
                <button className="filter-btn" onClick={showPreviousCard}>Previous</button>
                <button className="filter-btn active" onClick={shuffleCard}>Shuffle</button>
                <button className="filter-btn" onClick={showNextCard}>Next</button>
              </div>
            </div>
          ) : (
            <div className="programmes-list">
              {filteredProgrammes.map((programme, index) => renderProgrammeCard(programme, index))}
            </div>
          )
        ) : (
          <div className="no-results">No programmes found for the selected filter.</div>
        )}
      </div>
    </div>
  )
}
