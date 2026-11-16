import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import './ProgrammeCard.css'
import './ArticleCard.css'

function formatPublishedDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return {
    dateTime: date.toISOString(),
    label: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }
}

export default function ArticleCard({ article, variant = 'default' }) {
  const articleUrl = `/articles/${article.slug || article.id}`
  const publishedDate = formatPublishedDate(article.published_at)

  if (variant === 'featured') {
    return (
      <Link to={articleUrl} className="scope-articlecard article-feature-card">
        <div className="article-feature-media">
          {article.featured_image_url ? (
            <img
              src={article.featured_image_url}
              alt=""
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          ) : (
            <div className="article-media-placeholder" aria-hidden="true">
              <span>Multitech Journal</span>
            </div>
          )}
          <span className="article-feature-label">Latest story</span>
        </div>
        <div className="article-feature-body">
          <div className="article-card-byline">
            <span>Multitech Journal</span>
            {publishedDate && <time dateTime={publishedDate.dateTime}>{publishedDate.label}</time>}
          </div>
          <h2>{article.title}</h2>
          {article.excerpt && <p>{article.excerpt}</p>}
          <span className="article-card-link">
            Read the story
            <ArrowUpRight size={17} aria-hidden="true" />
          </span>
        </div>
      </Link>
    )
  }

  if (variant === 'archive') {
    return (
      <Link to={articleUrl} className="scope-articlecard article-archive-card">
        <div className="article-archive-media">
          {article.featured_image_url ? (
            <img
              src={article.featured_image_url}
              alt=""
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          ) : (
            <div className="article-media-placeholder" aria-hidden="true">
              <span>Multitech Journal</span>
            </div>
          )}
        </div>
        <div className="article-archive-body">
          <div className="article-card-byline">
            <span>Multitech Journal</span>
            {publishedDate && <time dateTime={publishedDate.dateTime}>{publishedDate.label}</time>}
          </div>
          <h3>{article.title}</h3>
          {article.excerpt && <p>{article.excerpt}</p>}
          <span className="article-card-link">
            Read story
            <ArrowUpRight size={16} aria-hidden="true" />
          </span>
        </div>
      </Link>
    )
  }

  return (
    <Link to={articleUrl} className="scope-articlecard programme-card article-card">
      {article.featured_image_url ? (
        <img
          src={article.featured_image_url}
          alt={article.title}
          className="programme-card-image"
          loading="lazy"
          decoding="async"
          fetchpriority="low"
        />
      ) : (
        <div className="programme-card-placeholder">No Image Available</div>
      )}

      <div className="programme-card-overlay">
        <div className="programme-card-content">
          <h3 className="programme-card-title">{article.title}</h3>
          {article.excerpt && <p className="programme-card-desc">{article.excerpt}</p>}
        </div>
      </div>
    </Link>
  )
}