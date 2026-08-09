import './SkeletonCard.css'

export default function SkeletonCard() {
  return (
    <div className="scope-skeletoncard programme-card skeleton-card">
      <div className="skeleton-image" />
      <div className="programme-card-overlay">
        <div className="programme-card-content">
          <div className="skeleton-title" />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-line-short" />
        </div>
      </div>
    </div>
  )
}
