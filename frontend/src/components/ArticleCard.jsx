import { Link } from 'react-router-dom'
import './ProgrammeCard.css'
import './ArticleCard.css'

export default function ArticleCard({ article }) {

  return (
    <Link to={`/articles/${article.slug || article.id}`} className="scope-articlecard programme-card article-card">
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