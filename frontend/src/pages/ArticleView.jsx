import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import Seo from '../components/Seo'

export default function ArticleView() {
  const { slug } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/articles/${slug}`)
        setArticle(res.data.data)
      } catch (err) {
        setError('Failed to load article.')
      } finally {
        setLoading(false)
      }
    }
    fetchArticle()
  }, [slug])

  if (loading) return <div className="container" style={{ padding: '4rem 2rem' }}><h2>Loading...</h2></div>
  if (error) return <div className="container" style={{ padding: '4rem 2rem' }}><h2>{error}</h2><Link to="/articles">Back to Articles</Link></div>
  if (!article) return null

  return (
    <div className="container" style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
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
          fetchPriority="high"
          style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px', marginBottom: '2rem' }}
        />
      )}

      <div style={{ lineHeight: '1.8', fontSize: '1.1rem', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
        {article.content}
      </div>
    </div>
  )
}
