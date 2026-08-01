import { useState } from 'react'
import { useApiQuery } from '../hooks/useApiQuery'
import './Articles.css'
import ArticleCard from '../components/ArticleCard'
import SkeletonCard from '../components/SkeletonCard'
import Seo from '../components/Seo'

export default function Articles() {
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 8

  const { data: response, isLoading: loading } = useApiQuery('/articles', 'articles')
  const articles = response?.data || []

  const totalPages = Math.max(1, Math.ceil(articles.length / perPage))
  const start = (currentPage - 1) * perPage
  const displayItems = articles.slice(start, start + perPage)

  const gotoPage = (n) => {
    if (n < 1 || n > totalPages) return
    setCurrentPage(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="articles-page container">
      <Seo
        title="Articles and News"
        description="Read the latest articles, campus news, and insights from Multitech Business School."
        path="/articles"
        keywords={['multitech articles', 'multitech news', 'business school updates']}
      />
      <h1>Latest News & Articles</h1>
      <p className="article-intro">Stay updated with the latest from Multitech Business School.</p>

      <div className="articles-grid">
        {loading ? (
          // Show 8 skeleton cards while loading
          Array.from({ length: 8 }).map((_, idx) => <SkeletonCard key={`skeleton-${idx}`} />)
        ) : articles.length > 0 ? (
          displayItems.map(article => <ArticleCard key={article.id} article={article} />)
        ) : (
          <p>No articles published yet.</p>
        )}
      </div>

      {!loading && articles.length > perPage && (
        <div className="pagination" style={{ marginTop: '2rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button className="button" onClick={() => gotoPage(currentPage - 1)} disabled={currentPage === 1}>Prev</button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className={`button ${currentPage === i + 1 ? 'button-accent' : ''}`}
              onClick={() => gotoPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button className="button" onClick={() => gotoPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
        </div>
      )}
    </div>
  )
}
