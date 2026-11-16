import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import './ProgrammeCard.css'
import './ProgrammeCatalogCard.css'

export default function ProgrammeCard({ title, description, imageUrl, linkTo, onClick, actionText, eyebrow, variant }) {
  const isCatalog = variant === 'catalog'
  const cardContent = (
    <>
      {isCatalog ? (
        <>
          <div className="programme-card-media">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="programme-card-image"
                loading="lazy"
                decoding="async"
                fetchpriority="low"
              />
            ) : (
              <div className="programme-card-placeholder">Programme</div>
            )}
          </div>
          <div className="programme-card-content programme-card-content--catalog">
            {eyebrow && <span className="programme-card-eyebrow">{eyebrow}</span>}
            <h3 className="programme-card-title">{title}</h3>
            {description && <p className="programme-card-desc">{description}</p>}
            <span className="programme-card-action">
              {actionText || 'Explore programme'}
              <ArrowUpRight size={16} aria-hidden="true" />
            </span>
          </div>
        </>
      ) : (
        <>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
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
              <h3 className="programme-card-title">{title}</h3>
              {description && <p className="programme-card-desc">{description}</p>}
              {actionText && <span className="button button-accent programme-card-action">{actionText}</span>}
            </div>
          </div>
        </>
      )}
    </>
  )

  const handleClick = (event) => {
    if (!onClick) return
    event.preventDefault()
    event.stopPropagation()
    onClick(event)
  }

  if (linkTo) {
    return (
      <div className="programme-card-wrap">
        <Link to={linkTo} className={`scope-programmecard programme-card${isCatalog ? ' programme-card--catalog' : ''}`} onClick={handleClick}>
          {cardContent}
        </Link>
      </div>
    )
  }

  return (
    <div className="programme-card-wrap">
      <div className={`programme-card${isCatalog ? ' programme-card--catalog' : ''}`} onClick={onClick}>
        {cardContent}
      </div>
    </div>
  )
}
