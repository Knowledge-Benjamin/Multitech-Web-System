import { useState } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import ArticleCard from '../components/ArticleCard'
import Seo from '../components/Seo'
import './Articles.css'

const ARTICLES_PER_PAGE = 8

export default function Articles() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  const {
    data: response,
    isLoading: loading,
    isError,
    refetch
  } = useApiQuery('/articles', 'articles')
  const articles = response?.data || []
  const query = searchTerm.trim().toLocaleLowerCase()
  const filteredArticles = query
    ? articles.filter(article => `${article.title || ''} ${article.excerpt || ''}`.toLocaleLowerCase().includes(query))
    : articles

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE))
  const page = Math.min(currentPage, totalPages)
  const start = (page - 1) * ARTICLES_PER_PAGE
  const featuredArticle = !query && page === 1 ? filteredArticles[0] || null : null
  const displayItems = featuredArticle
    ? filteredArticles.slice(start + 1, start + ARTICLES_PER_PAGE)
    : filteredArticles.slice(start, start + ARTICLES_PER_PAGE)

  const gotoPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return
    setCurrentPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSearch = (event) => {
    setSearchTerm(event.target.value)
    setCurrentPage(1)
  }

  const clearSearch = () => {
    setSearchTerm('')
    setCurrentPage(1)
  }

  return (
    <div className="scope-articles articles-page">
      <Seo
        title="Articles and News"
        description="Read the latest articles, campus news, and insights from Multitech Business School."
        path="/articles"
        keywords={['multitech articles', 'multitech news', 'business school updates']}
      />

      <header className="articles-heading">
        <div className="articles-heading-copy">
          <span className="articles-eyebrow">Multitech journal</span>
          <h1>News, ideas &amp; <em>campus life.</em></h1>
          <p>Stories, perspectives, and updates from across our community.</p>
        </div>
        <div className="articles-heading-note" aria-hidden="true">
          <span className="articles-heading-mark">MBS</span>
          <span>Curiosity, in print.</span>
        </div>
      </header>

      <section className="articles-toolbar" aria-label="Find articles">
        <p className="articles-result-count" aria-live="polite">
          {loading
            ? 'Loading stories'
            : `${filteredArticles.length} ${filteredArticles.length === 1 ? 'story' : 'stories'}`}
        </p>
        <label className="articles-search">
          <Search size={18} aria-hidden="true" />
          <span className="visually-hidden">Search articles</span>
          <input
            type="search"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search stories"
            disabled={loading || isError}
          />
          {searchTerm && (
            <button type="button" className="articles-search-clear" onClick={clearSearch} aria-label="Clear search">
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>
      </section>

      {isError ? (
        <section className="articles-message" role="alert">
          <span className="articles-eyebrow">We couldn’t load the journal</span>
          <h2>Stories are temporarily unavailable.</h2>
          <p>Please check your connection and try again.</p>
          <button type="button" className="articles-retry" onClick={() => refetch()}>
            Try again
          </button>
        </section>
      ) : loading ? (
        <div className="articles-loading" role="status" aria-label="Loading articles" aria-busy="true">
          <div className="article-feature-skeleton" />
          <div className="articles-skeleton-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="article-card-skeleton" key={index}>
                <span />
                <div>
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredArticles.length > 0 ? (
        <>
          {featuredArticle && (
            <section className="articles-featured" aria-label="Latest story">
              <ArticleCard article={featuredArticle} variant="featured" />
            </section>
          )}

          {displayItems.length > 0 && (
            <section className="articles-results" aria-label={query ? 'Search results' : 'More stories'}>
              <div className="articles-results-heading">
                <div>
                  <span className="articles-eyebrow">{query ? 'Your search' : 'From our community'}</span>
                  <h2>{query ? 'Search results' : <>More <em>stories</em></>}</h2>
                </div>
                <span className="articles-results-range" aria-hidden="true">
                  {String(start + (featuredArticle ? 2 : 1)).padStart(2, '0')} — {String(start + displayItems.length + (featuredArticle ? 1 : 0)).padStart(2, '0')}
                </span>
              </div>
              <div className="articles-grid">
                {displayItems.map(article => (
                  <ArticleCard key={article.id} article={article} variant="archive" />
                ))}
              </div>
            </section>
          )}

          {totalPages > 1 && (
            <nav className="articles-pagination" aria-label="Article pages">
              <button
                type="button"
                className="articles-page-button articles-page-step"
                onClick={() => gotoPage(page - 1)}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={17} aria-hidden="true" />
                <span>Previous</span>
              </button>
              <div className="articles-page-numbers">
                {Array.from({ length: totalPages }).map((_, index) => {
                  const pageNumber = index + 1
                  return (
                    <button
                      type="button"
                      key={pageNumber}
                      className={`articles-page-button${page === pageNumber ? ' is-current' : ''}`}
                      onClick={() => gotoPage(pageNumber)}
                      aria-label={`Page ${pageNumber}`}
                      aria-current={page === pageNumber ? 'page' : undefined}
                    >
                      {pageNumber}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                className="articles-page-button articles-page-step"
                onClick={() => gotoPage(page + 1)}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      ) : (
        <section className="articles-message" role="status">
          <span className="articles-eyebrow">{query ? 'No matches' : 'The journal'}</span>
          <h2>{query ? 'No stories found.' : 'The next story is on its way.'}</h2>
          <p>{query ? 'Try another search, or clear the search to browse all stories.' : 'Published articles will appear here.'}</p>
          {query && (
            <button type="button" className="articles-retry" onClick={clearSearch}>
              Clear search
            </button>
          )}
        </section>
      )}
    </div>
  )
}
