import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProgrammeCard from '../components/ProgrammeCard'
import './Programmes.css'

const DESKTOP_PAGE_SIZE = 6

export default function Programmes() {
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(null)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
  const [page, setPage] = useState(1)

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
    setPage(1)
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

  const filteredProgrammes = filter === 'all' ? programmes : programmes.filter((programme) => programme.type === filter)
  const totalPages = Math.max(1, Math.ceil(filteredProgrammes.length / DESKTOP_PAGE_SIZE))
  const desktopProgrammes = filteredProgrammes.slice((page - 1) * DESKTOP_PAGE_SIZE, page * DESKTOP_PAGE_SIZE)

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

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

  const renderProgrammeCard = (programme, index, onClick) => (
    <ProgrammeCard
      key={programme.id || index}
      title={programme.name}
      description={programme.description}
      imageUrl={programme.image_url}
      actionText="View Details"
      linkTo={`/programmes/${programme.id}`}
      onClick={onClick}
    />
  )

  const getDeckCards = (currentIndex, items) => {
    if (items.length <= 1) return items
    return [
      items[currentIndex],
      items[(currentIndex + 1) % items.length],
      items[(currentIndex + 2) % items.length]
    ]
  }

  const deckCards = getDeckCards(activeIndex, filteredProgrammes)

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
            className={`filter-btn ${filter === 'shortcourses' ? 'active' ? '' : ''}`}
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
              <div className="programmes-mobile-hint">Swipe or tap the top card to shuffle through programmes</div>
              <div className="programmes-mobile-counter">{activeIndex + 1} / {filteredProgrammes.length}</div>
              <div className="programmes-mobile-stack" role="presentation">
                {deckCards.map((programme, stackIndex) => {
                  const isTopCard = stackIndex === 0
                  const stackTransform = stackIndex === 0
                    ? 'translate3d(0, 0, 0) rotate(0deg) scale(1)'
                    : stackIndex === 1
                      ? 'translate3d(10px, 16px, 0) rotate(4deg) scale(0.96)'
                      : 'translate3d(-8px, 24px, 0) rotate(-4deg) scale(0.92)'

                  return (
                    <div
                      key={`${programme.id || programme.name}-${stackIndex}`}
                      className={`programmes-mobile-stack-card${isTopCard ? ' active' : ''}`}
                      style={{ transform: stackTransform, zIndex: 3 - stackIndex }}
                      onClick={isTopCard ? showNextCard : undefined}
                    >
                      {renderProgrammeCard(programme, (activeIndex + stackIndex) % filteredProgrammes.length, isTopCard ? showNextCard : undefined)}
                    </div>
                  )
                })}
              </div>
              <div className="programmes-mobile-actions">
                <button className="filter-btn" onClick={showPreviousCard}>Previous</button>
                <button className="filter-btn active" onClick={shuffleCard}>Shuffle</button>
                <button className="filter-btn" onClick={showNextCard}>Next</button>
              </div>
            </div>
          ) : (
            <>
              <div className="programmes-list">
                {isMobile ? filteredProgrammes.map((programme, index) => renderProgrammeCard(programme, index)) : desktopProgrammes.map((programme, index) => renderProgrammeCard(programme, index))}
              </div>
              {!isMobile && filteredProgrammes.length > DESKTOP_PAGE_SIZE && (
                <div className="programmes-pagination">
                  <button className="filter-btn" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      className={`filter-btn ${pageNumber === page ? 'active' : ''}`}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button className="filter-btn" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>
                    Next
                  </button>
                </div>
              )}
            </>
          )
        ) : (
          <div className="no-results">No programmes found for the selected filter.</div>
        )}
      </div>
    </div>
  )
}
