import React, { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'

export default function LatestArticlesCarousel({ articles = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [Autoplay({ delay: 4000, stopOnInteraction: true, stopOnMouseEnter: true })])
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

  const scrollTo = useCallback((index) => {
    if (!emblaApi) return
    emblaApi.scrollTo(index)
  }, [emblaApi])

  return (
    <div className="scope-latestarticlescarousel latest-articles-carousel" ref={emblaRef}>
      <div className="latest-articles-carousel__container">
        {articles.map((article) => (
          <div className="latest-articles-carousel__slide" key={article.id}>
            <div className="latest-articles-carousel__card">
              <article className="programme-card article-card">
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
              </article>
            </div>
          </div>
        ))}
      </div>

      {articles.length > 1 && (
        <div className="latest-articles-carousel__dots" aria-label="Latest articles carousel navigation">
          {articles.map((_, index) => (
            <button
              key={index}
              className={`latest-articles-carousel__dot ${index === selected ? 'is-selected' : ''}`}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => scrollTo(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
