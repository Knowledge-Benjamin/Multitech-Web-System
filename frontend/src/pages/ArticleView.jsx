import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import Seo from '../components/Seo'
import './ArticleView.css'

export default function ArticleView() {
  const { slug } = useParams()
  const {
    data: response,
    isLoading: loading,
    isError,
    refetch
  } = useApiQuery(`/articles/${slug}`, `article-${slug}`)
  const article = response?.data || null

  if (loading) {
    return (
      <div className="scope-articleview article-story-loading" role="status" aria-label="Loading article">
        <div className="article-story-skeleton" />
      </div>
    )
  }

  if (isError || !article) {
    return (
      <div className="scope-articleview article-story-message">
        <span className="article-story-eyebrow">{isError ? 'Story unavailable' : 'Not found'}</span>
        <h1>{isError ? 'We couldn’t load this story.' : 'This story isn’t available.'}</h1>
        <p>{isError ? 'Please check your connection and try again.' : 'The article may have been moved or removed.'}</p>
        <div className="article-story-message-actions">
          {isError && (
            <button type="button" className="article-story-retry" onClick={() => refetch()}>
              Try again
            </button>
          )}
          <Link to="/articles" className="article-back-link">
            <ArrowLeft size={17} aria-hidden="true" />
            Back to all stories
          </Link>
        </div>
      </div>
    )
  }

  const publishedDate = article.published_at ? new Date(article.published_at) : null
  const hasPublishedDate = publishedDate && !Number.isNaN(publishedDate.getTime())
  const paragraphs = (article.content || '')
    .split(/\r?\n\s*\r?\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)

  return (
    <article className="scope-articleview article-story-page">
      <Seo
        title={article.title}
        description={article.excerpt || article.title}
        path={`/articles/${article.slug || article.id}`}
        image={article.featured_image_url || undefined}
        keywords={['multitech article', 'multitech business school']}
      />

      <div className="article-story-shell">
        <nav className="article-story-breadcrumb" aria-label="Breadcrumb">
          <Link to="/articles">
            <ArrowLeft size={16} aria-hidden="true" />
            All stories
          </Link>
          <span aria-hidden="true">/</span>
          <span>Multitech Journal</span>
        </nav>

        <header className="article-story-header">
          <span className="article-story-eyebrow">Multitech journal</span>
          <h1>{article.title}</h1>
          {article.excerpt && <p className="article-story-excerpt">{article.excerpt}</p>}
          {hasPublishedDate && (
            <time className="article-story-date" dateTime={publishedDate.toISOString()}>
              {publishedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </time>
          )}
        </header>

        {article.featured_image_url && (
          <figure className="article-story-image">
            <img src={article.featured_image_url} alt="" loading="eager" decoding="async" fetchPriority="high" />
          </figure>
        )}

        <div className="article-story-content">
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
          ) : (
            <p>This story does not have any article text yet.</p>
          )}
        </div>

        <footer className="article-story-footer">
          <Link to="/articles" className="article-back-link">
            <ArrowLeft size={17} aria-hidden="true" />
            Back to all stories
          </Link>
          <Link to="/articles" className="article-more-link">
            Explore the journal
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </article>
  )
}
