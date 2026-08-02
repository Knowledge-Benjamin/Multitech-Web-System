import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProgrammeCard from '../components/ProgrammeCard'
import { useApiQuery } from '../hooks/useApiQuery'
import './Programmes.css'

const DESKTOP_PAGE_SIZE = 6
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export default function Programmes() {
  const { data: progRes, isLoading: loading, refetch } = useApiQuery('/programmes', 'programmes')
  const { data: campRes, isLoading: loadingCampuses } = useApiQuery('/campuses', 'publicCampuses')
  const { data: facRes, isLoading: loadingFaculties } = useApiQuery('/faculties', 'publicFaculties')
  
  const programmes = progRes?.data || []
  const campuses = campRes?.data || []
  const faculties = facRes?.data || []
  
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
  const [page, setPage] = useState(1)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [dragStartX, setDragStartX] = useState(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const initialFilter = searchParams.get('filter') || 'all'
  const initialCampus = searchParams.get('campus') || 'all'
  const initialFaculty = searchParams.get('faculty') || 'all'
  
  const [filter, setFilter] = useState(initialFilter)
  const [campusFilter, setCampusFilter] = useState(initialCampus)
  const [facultyFilter, setFacultyFilter] = useState(initialFaculty)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const handleProgrammeChanged = () => {
      refetch?.()
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
  }, [refetch])

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
  }, [filter, campusFilter, facultyFilter, searchQuery, programmes.length])

  const updateQueryParams = (newFilter, newCampus, newFaculty) => {
    const params = {}
    if (newFilter !== 'all') params.filter = newFilter
    if (newCampus !== 'all') params.campus = newCampus
    if (newFaculty !== 'all') params.faculty = newFaculty
    setSearchParams(params)
  }

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
    updateQueryParams(newFilter, campusFilter, facultyFilter)
  }
  
  const handleCampusChange = (e) => {
    const newCampus = e.target.value
    setCampusFilter(newCampus)
    updateQueryParams(filter, newCampus, facultyFilter)
  }
  
  const handleFacultyChange = (e) => {
    const newFaculty = e.target.value
    setFacultyFilter(newFaculty)
    updateQueryParams(filter, campusFilter, newFaculty)
  }

  const filteredProgrammes = programmes.filter((programme) => {
    // Search Query Match
    const matchesSearch = programme.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (programme.description && programme.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    // Type Filter Match
    const matchesType = filter === 'all' || programme.type === filter
    
    // Campus Filter Match
    const matchesCampus = campusFilter === 'all' || 
                          (programme.campus_ids && programme.campus_ids.includes(Number(campusFilter)))
                          
    // Faculty Filter Match
    const matchesFaculty = facultyFilter === 'all' || 
                           (programme.faculty_id && programme.faculty_id === Number(facultyFilter))
                           
    return matchesSearch && matchesType && matchesCampus && matchesFaculty
  })

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
      linkTo={`/programmes/${programme.slug || programme.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || programme.id}`}
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

        {/* Enhanced Search and Structure Filters */}
        <div className="search-filter-bar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', background: 'rgba(255,255,255,0.8)', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', backdropFilter: 'blur(10px)' }}>
          <div className="search-group" style={{ flex: '1 1 300px' }}>
            <input 
              type="text" 
              placeholder="Search programmes by name or keyword..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none' }}
            />
          </div>
          <div className="dropdown-group" style={{ display: 'flex', gap: '1rem', flex: '1 1 300px' }}>
            <select 
              value={campusFilter} 
              onChange={handleCampusChange}
              style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none', background: 'white' }}
            >
              <option value="all">All Campuses</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            
            <select 
              value={facultyFilter} 
              onChange={handleFacultyChange}
              style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none', background: 'white' }}
            >
              <option value="all">All Faculties</option>
              {faculties.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        {(loading || loadingCampuses || loadingFaculties) ? (
          <div className="loading">Loading programmes...</div>
        ) : filteredProgrammes.length > 0 ? (
          isMobile && filteredProgrammes.length > 1 ? (
            <div className="programmes-mobile-deck">
              <div className="programmes-mobile-hint">Swipe the top card to shuffle through programmes</div>
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
                      {renderProgrammeCard(programme, (activeIndex + stackIndex) % filteredProgrammes.length, undefined)}
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
