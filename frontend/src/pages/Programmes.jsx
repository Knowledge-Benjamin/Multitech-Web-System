import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid, List } from 'lucide-react'
import ProgrammeCard from '../components/ProgrammeCard'
import { useApiQuery } from '../hooks/useApiQuery'
import { useScrollFade } from '../hooks/useScrollFade'
import './Programmes.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export default function Programmes() {
  const { data: progRes, isLoading: loading, refetch } = useApiQuery('/programmes', 'programmes')
  const { data: campRes, isLoading: loadingCampuses } = useApiQuery('/campuses', 'publicCampuses')
  const { data: facRes, isLoading: loadingFaculties } = useApiQuery('/faculties', 'publicFaculties')
  
  const programmes = progRes?.data || []
  const campuses = campRes?.data || []
  const faculties = facRes?.data || []
  
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

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
    setPage(1)
  }, [filter, campusFilter, facultyFilter, searchQuery, programmes.length, viewMode])

  const updateQueryParams = (newFilter, newCampus, newFaculty) => {
    const params = {}
    if (newFilter !== 'all') params.filter = newFilter
    if (newCampus !== 'all') params.campus = newCampus
    if (newFaculty !== 'all') params.faculty = newFaculty
    setSearchParams(params)
  }

  const clearFilters = () => {
    setFilter('all')
    setCampusFilter('all')
    setFacultyFilter('all')
    setSearchQuery('')
    updateQueryParams('all', 'all', 'all')
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

  const PAGE_SIZE = viewMode === 'list' ? 12 : 6
  const totalPages = Math.max(1, Math.ceil(filteredProgrammes.length / PAGE_SIZE))
  const paginatedProgrammes = filteredProgrammes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useScrollFade(0.1, '0px 0px -50px 0px', [page, viewMode, filteredProgrammes.length])

  const renderProgrammeCard = (programme, index) => (
    <div key={programme.id || index} className="fade-in-section" style={{ transitionDelay: `${(index % PAGE_SIZE) * 50}ms` }}>
      <ProgrammeCard
        variant="catalog"
        title={programme.name}
        description={programme.description}
        imageUrl={programme.image_url}
        eyebrow={programme.type || 'Programme'}
        actionText="View programme"
        linkTo={`/programmes/${programme.slug || programme.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || programme.id}`}
      />
    </div>
  )

  const renderProgrammeListItem = (programme, index) => (
    <div key={programme.id || index} className="fade-in-section programme-list-item" style={{ transitionDelay: `${(index % PAGE_SIZE) * 50}ms` }}>
      {programme.image_url && (
        <div className="programme-list-image">
          <img src={programme.image_url} alt={programme.name} loading="lazy" />
        </div>
      )}
      <div className="programme-list-content">
        <h3>{programme.name}</h3>
        <p>{programme.description?.substring(0, 120) || 'No description available'}{programme.description?.length > 120 ? '...' : ''}</p>
      </div>
      <div className="programme-list-action">
        <a href={`/programmes/${programme.slug || programme.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || programme.id}`} className="button button-primary">View</a>
      </div>
    </div>
  )

  return (
    <div className="scope-programmes programmes-page">
      <div className="page-header fade-in-section">
        <span className="programmes-eyebrow">Study at Multitech</span>
        <h1>Find your next <em>step</em></h1>
        <p>Explore our programmes and filter by study level, campus, or faculty to find the right fit.</p>
      </div>

      <div className="container">
        <div className="filter-section-wrapper fade-in-section">
          <div className="filter-section" role="group" aria-label="Filter by programme type">
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} aria-pressed={filter === 'all'} onClick={() => handleFilterChange('all')}>All Programmes</button>
            <button className={`filter-btn ${filter === 'undergraduate' ? 'active' : ''}`} aria-pressed={filter === 'undergraduate'} onClick={() => handleFilterChange('undergraduate')}>Undergraduate</button>
            <button className={`filter-btn ${filter === 'postgraduate' ? 'active' : ''}`} aria-pressed={filter === 'postgraduate'} onClick={() => handleFilterChange('postgraduate')}>Postgraduate</button>
            <button className={`filter-btn ${filter === 'diploma' ? 'active' : ''}`} aria-pressed={filter === 'diploma'} onClick={() => handleFilterChange('diploma')}>Diploma</button>
            <button className={`filter-btn ${filter === 'professional' ? 'active' : ''}`} aria-pressed={filter === 'professional'} onClick={() => handleFilterChange('professional')}>Professional</button>
            <button className={`filter-btn ${filter === 'shortcourses' ? 'active' : ''}`} aria-pressed={filter === 'shortcourses'} onClick={() => handleFilterChange('shortcourses')}>Short Courses</button>
          </div>
        </div>

        {/* Enhanced Search and Structure Filters */}
        <div className="search-filter-bar fade-in-section">
          <div className="search-group">
            <label className="programmes-sr-only" htmlFor="programme-search">Search programmes</label>
            <input 
              id="programme-search"
              type="text" 
              placeholder="Search programmes by name or keyword..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="premium-input search-input"
            />
          </div>
          <div className="dropdown-group">
            <select value={campusFilter} onChange={handleCampusChange} className="premium-input" aria-label="Filter by campus">
              <option value="all">All Campuses</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <select value={facultyFilter} onChange={handleFacultyChange} className="premium-input" aria-label="Filter by faculty">
              <option value="all">All Faculties</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            
            <div className="view-mode-toggle" role="group" aria-label="Programme display">
              <button 
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} 
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                title="Grid View"
              >
                <LayoutGrid size={20} />
              </button>
              <button 
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`} 
                onClick={() => setViewMode('list')}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                title="List View"
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        {(loading || loadingCampuses || loadingFaculties) ? (
          <div className="loading fade-in-section">Loading programmes...</div>
        ) : (
          <>
            <div className="programmes-results-summary" aria-live="polite">
              <span><strong>{filteredProgrammes.length}</strong> {filteredProgrammes.length === 1 ? 'programme' : 'programmes'} found</span>
              <span>Choose a programme to view full details.</span>
            </div>
            {filteredProgrammes.length > 0 ? (
              <div>
                <div className={viewMode === 'grid' ? 'programmes-list' : 'programmes-compact-list'}>
                  {paginatedProgrammes.map((programme, index) => (
                    viewMode === 'grid'
                      ? renderProgrammeCard(programme, index)
                      : renderProgrammeListItem(programme, index)
                  ))}
                </div>
                {filteredProgrammes.length > PAGE_SIZE && (
                  <div className="programmes-pagination fade-in-section">
                    <button className="pagination-btn prev-btn" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                      Previous
                    </button>
                    <div className="pagination-numbers">
                      {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
                        if (pageNumber === 1 || pageNumber === totalPages || (pageNumber >= page - 1 && pageNumber <= page + 1)) {
                          return (
                            <button
                              key={pageNumber}
                              className={`pagination-number ${pageNumber === page ? 'active' : ''}`}
                              onClick={() => setPage(pageNumber)}
                            >
                              {pageNumber}
                            </button>
                          )
                        }
                        if (pageNumber === page - 2 || pageNumber === page + 2) {
                          return <span key={`ellipsis-${pageNumber}`} className="pagination-ellipsis">...</span>
                        }
                        return null
                      })}
                    </div>
                    <button className="pagination-btn next-btn" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-results fade-in-section">
                <p>No programmes match those filters.</p>
                <button type="button" className="clear-filters-btn" onClick={clearFilters}>Clear filters</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
