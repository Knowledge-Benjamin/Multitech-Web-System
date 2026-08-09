import React, { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import * as LucideIcons from 'lucide-react'
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
    <section className="scope-reasonscarousel reasons-carousel">
      <div className="reasons-embla" ref={emblaRef}>
        <div className="reasons-container">
          {reasons.map((r) => {
            // Render the lucide icon if it exists, otherwise fallback to Award
            const IconComponent = LucideIcons[r.icon] || LucideIcons.Award
            
            return (
              <div className="reason-slide" key={r.id}>
                <div className="reason-card">
                  <div className="reason-icon">
                    <IconComponent size={48} strokeWidth={1.5} color="#0052CC" />
                  </div>
                  <h3 className="reason-title">{r.title}</h3>
                  <ul className="reason-points">
                    {(r.points || []).map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <button className="reasons-arrow prev" onClick={scrollPrev}>&#10094;</button>
      <button className="reasons-arrow next" onClick={scrollNext}>&#10095;</button>
    </section>
  )
}

