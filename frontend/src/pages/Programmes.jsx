import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProgrammeCard from '../components/ProgrammeCard'
import './Programmes.css'

const DESKTOP_PAGE_SIZE = 6

export default function Programmes() {
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
  const [page, setPage] = useState(1)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [dragStartX, setDragStartX] = useState(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const initialFilter = searchParams.get('filter') || 'all'
  const [filter, setFilter] = useState(initialFilter)

  useEffect(() => {
    fetchProgrammes()

    const handleProgrammeChanged = () => {
      fetchProgrammes()
    }

    window.addEventListener('multitech:programmes-updated', handleProgrammeChanged)
    window.addEventListener('storage', (event) => {
      if (event.key === 'multitech:programmes-updated') {
        handleProgrammeChanged()
      }
    })

    return () => {
      window.removeEventListener('multitech:programmes-updated', handleProgrammeChanged)
    }
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
    setLoading(true)
    try {
      const response = await fetch(`/api/programmes?ts=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`Programme request failed with status ${response.status}`)
      }

      const result = await response.json()
      const nextProgrammes = Array.isArray(result?.data) ? result.data : []
      setProgrammes(nextProgrammes)
    } catch (error) {
      console.error('Failed to fetch programmes:', error)
      setProgrammes([])
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

  const handleCardPointerDown = (event) => {
    if (!isMobile || filteredProgrammes.length <= 1) return
    setDragStartX(event.clientX)
    setIsDragging(true)
    setIsAnimatingOut(false)
  }

  const handleCardPointerMove = (event) => {
    if (!isDragging || dragStartX === null) return
    setDragOffset(event.clientX - dragStartX)
  }

  const handleCardPointerEnd = () => {
    if (!isDragging) return

    if (dragOffset < -90) {
      setIsAnimatingOut(true)
      setDragOffset(-140)
      window.setTimeout(() => {
        showNextCard()
        setDragOffset(0)
        setIsAnimatingOut(false)
        setIsDragging(false)
      }, 220)
      return
    }

    if (dragOffset > 90) {
      setIsAnimatingOut(true)
      setDragOffset(140)
      window.setTimeout(() => {
        showPreviousCard()
        setDragOffset(0)
        setIsAnimatingOut(false)
        setIsDragging(false)
      }, 220)
      return
    }

    setDragOffset(0)
    setIsDragging(false)
    setDragStartX(null)
  }

  const handleTopCardTap = (event) => {
    if (!isMobile || filteredProgrammes.length <= 1 || isDragging) return
    event.preventDefault()
    event.stopPropagation()
    setIsAnimatingOut(true)
    setDragOffset(-120)
    window.setTimeout(() => {
      showNextCard()
      setDragOffset(0)
      setIsAnimatingOut(false)
    }, 220)
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
            <div className="programmes-mobile-deck">
              <div className="programmes-mobile-hint">Swipe or tap the top card to shuffle through programmes</div>
              <div className="programmes-mobile-counter">{activeIndex + 1} / {filteredProgrammes.length}</div>
              <div className="programmes-mobile-stack" role="presentation">
                {deckCards.map((programme, stackIndex) => {
                  const isTopCard = stackIndex === 0
                  const depthScale = stackIndex === 0 ? 1 : stackIndex === 1 ? 0.94 : 0.88
                  const depthOffsetX = stackIndex === 1 ? 14 : stackIndex === 2 ? -14 : 0
                  const depthOffsetY = stackIndex === 1 ? 18 : stackIndex === 2 ? 26 : 0
                  const depthRotation = stackIndex === 1 ? 4 : stackIndex === 2 ? -4 : 0
                  const stackTransform = stackIndex === 0
                    ? isAnimatingOut
                      ? `translate3d(${dragOffset}px, 0, 0) rotate(${dragOffset / 22}deg) scale(${depthScale})`
                      : `translate3d(${dragOffset}px, 0, 0) rotate(${dragOffset / 28}deg) scale(${depthScale})`
                    : `translate3d(${depthOffsetX}px, ${depthOffsetY}px, 0) rotate(${depthRotation}deg) scale(${depthScale})`

                  return (
                    <div
                      key={`${programme.id || programme.name}-${stackIndex}`}
                      className={`programmes-mobile-stack-card${isTopCard ? ' active' : ''}${isDragging && isTopCard ? ' is-dragging' : ''}`}
                      style={{ transform: stackTransform, zIndex: 3 - stackIndex }}
                      onPointerDown={isTopCard ? handleCardPointerDown : undefined}
                      onPointerMove={isTopCard ? handleCardPointerMove : undefined}
                      onPointerUp={isTopCard ? handleCardPointerEnd : undefined}
                      onPointerCancel={isTopCard ? handleCardPointerEnd : undefined}
                    >
                      {renderProgrammeCard(programme, (activeIndex + stackIndex) % filteredProgrammes.length, isTopCard ? handleTopCardTap : undefined)}
                    </div>
                  )
                })}
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
