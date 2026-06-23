import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import ProgrammeCard from '../components/ProgrammeCard'
import './Programmes.css'

export default function Programmes() {
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  
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
        ) : (
          <div className="programmes-list">
            {filteredProgrammes.length > 0 ? (
              filteredProgrammes.map(programme => (
                <ProgrammeCard 
                  key={programme.id} 
                  title={programme.name} 
                  description={programme.description}
                  imageUrl={programme.image_url} 
                  actionText="View Details"
                  linkTo={`/programmes/${programme.id}`}
                />
              ))
            ) : (
              <div className="no-results">No programmes found for the selected filter.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
