import React, { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import './ReasonsCarousel.css'

export default function ReasonsCarousel({ reasons = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [Autoplay({ delay: 4000, stopOnInteraction: true })])
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
  }, [emblaApi, onSelect])

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev()
  const scrollNext = () => emblaApi && emblaApi.scrollNext()

  return (
    <section className="reasons-carousel">
      <div className="reasons-embla" ref={emblaRef}>
        <div className="reasons-container">
          {reasons.map((r) => (
            <div className="reason-slide" key={r.id}>
              <div className="reason-card">
                <div className="reason-icon">{r.icon || '★'}</div>
                <h3 className="reason-title">{r.title}</h3>
                <ul className="reason-points">
                  {(r.points || []).map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="reasons-arrow prev" onClick={scrollPrev}>&#10094;</button>
      <button className="reasons-arrow next" onClick={scrollNext}>&#10095;</button>
    </section>
  )
}
