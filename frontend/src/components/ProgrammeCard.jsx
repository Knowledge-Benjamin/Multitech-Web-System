import { Link } from 'react-router-dom'
import './ProgrammeCard.css'

export default function ProgrammeCard({ title, description, imageUrl, linkTo, onClick, actionText }) {
  const cardContent = (
    <>
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="programme-card-image" />
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
  )

  const handleClick = (event) => {
    if (!onClick) return
    event.preventDefault()
    event.stopPropagation()
    onClick(event)
  }

  if (linkTo) {
    return (
      <Link to={linkTo} className="programme-card" onClick={handleClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        {cardContent}
      </Link>
    )
  }

  return (
    <div className="programme-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {cardContent}
    </div>
  )
}
