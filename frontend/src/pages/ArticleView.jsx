import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useApiQuery } from '../hooks/useApiQuery'
import { useScrollFade } from '../hooks/useScrollFade'
import Seo from '../components/Seo'

export default function ArticleView() {
  const { slug } = useParams()
  const { data: response, isLoading: loading, isError } = useApiQuery(`/articles/${slug}`, `article-${slug}`)
  const article = response?.data || null
  const error = isError ? 'Failed to load article.' : ''
  useScrollFade()

  if (loading) return <div className="container" style={{ padding: '4rem 2rem' }}><h2>Loading...</h2></div>
  if (error) return <div className="container" style={{ padding: '4rem 2rem' }}><h2>{error}</h2><Link to="/articles">Back to Articles</Link></div>
  if (!article) return null

  return (
    <div className="scope-articleview container fade-in-section" style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
      <Seo
        title={article.title}
        description={article.excerpt || article.title}
        path={`/articles/${article.slug || article.id}`}
        image={article.featured_image_url || undefined}
        keywords={['multitech article', 'multitech business school']}
      />
      <Link to="/articles" style={{ color: '#003366', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
        &larr; Back to Articles
      </Link>
      
      <h1 style={{ marginBottom: '0.5rem' }}>{article.title}</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Published on {new Date(article.published_at).toLocaleDateString()}
      </p>

      {article.featured_image_url && (
        <img
          src={article.featured_image_url}
          alt={article.title}
          loading="eager"
          decoding="async"
          fetchpriority="high"
          style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px', marginBottom: '2rem' }}
        />
      )}

      <div style={{ lineHeight: '1.8', fontSize: '1.1rem', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
        {article.content}
      </div>
    </div>
  )
}
