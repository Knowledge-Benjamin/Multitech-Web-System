import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import * as LucideIcons from 'lucide-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './ReasonsCarousel.css'

export default function ReasonsCarousel({ reasons = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: reasons.length > 1,
    breakpoints: {
      '(min-width: 761px)': { active: false }
    }
  })
  const [selected, setSelected] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelected(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollPrev = () => emblaApi?.scrollPrev()
  const scrollNext = () => emblaApi?.scrollNext()
  const scrollTo = (index) => emblaApi?.scrollTo(index)

  return (
    <div className="scope-reasonscarousel reasons-carousel">
      <div
        className="reasons-embla"
        ref={emblaRef}
        role="region"
        aria-label="Reasons to choose Multitech Business School"
        aria-roledescription="carousel"
      >
        <div className="reasons-container">
          {reasons.map((reason, index) => {
            const IconComponent = LucideIcons[reason.icon] || LucideIcons.Award
            const titleWords = String(reason.title || 'A reason to choose Multitech')
              .trim()
              .split(/\s+/)
            const accentWord = titleWords.pop()
            const titleLead = titleWords.join(' ')

            return (
              <div
                className="reason-slide"
                key={reason.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${reasons.length}`}
                style={{ animationDelay: `${Math.min(index, 5) * 90}ms` }}
              >
                <article className="reason-card">
                  <div className="reason-card-topline">
                    <span className="reason-index" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="reason-icon" aria-hidden="true">
                      <IconComponent size={27} strokeWidth={1.45} />
                    </span>
                  </div>
                  <h3 className="reason-title">
                    {titleLead && <>{titleLead}{' '}</>}
                    <em>{accentWord}</em>
                  </h3>
                  <ul className="reason-points">
                    {(reason.points || []).map((point, pointIndex) => (
                      <li key={`${reason.id}-${pointIndex}`}>
                        <span className="reason-point-marker" aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            )
          })}
        </div>
      </div>

      {reasons.length > 1 && (
        <div className="reasons-controls">
          <button
            className="reasons-arrow"
            type="button"
            onClick={scrollPrev}
            aria-label="Show previous reason"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <div className="reasons-dots" role="group" aria-label="Choose a reason">
            {reasons.map((reason, index) => (
              <button
                className={`reasons-dot ${selected === index ? 'is-selected' : ''}`}
                type="button"
                key={reason.id}
                onClick={() => scrollTo(index)}
                aria-label={`Show reason ${index + 1}: ${reason.title}`}
                aria-current={selected === index ? 'true' : undefined}
              />
            ))}
          </div>
          <span className="reasons-sr-only" aria-live="polite" aria-atomic="true">
            {`Reason ${selected + 1} of ${reasons.length}: ${reasons[selected]?.title || ''}`}
          </span>
          <button
            className="reasons-arrow"
            type="button"
            onClick={scrollNext}
            aria-label="Show next reason"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
