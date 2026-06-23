import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './Home.css' // using existing styles for simplicity

export default function Articles() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/articles`)
        setArticles(res.data.data)
      } catch (err) {
        console.error('Failed to load articles', err)
      } finally {
        setLoading(false)
      }
    }
    fetchArticles()
  }, [])

  if (loading) {
    return <div className="container" style={{ padding: '4rem 2rem' }}><h2>Loading...</h2></div>
  }

  return (
    <div className="container" style={{ padding: '4rem 2rem' }}>
      <h1>Latest News & Articles</h1>
      <p style={{ marginBottom: '2rem' }}>Stay updated with the latest from Multitech Business School.</p>
      
      <div className="programmes-grid">
        {articles.map(article => (
          <div key={article.id} className="programme-card" style={{ display: 'flex', flexDirection: 'column' }}>
            {article.featured_image_url && (
              <img 
                src={article.featured_image_url} 
                alt={article.title} 
                style={{ width: '100%', height: '200px', objectFit: 'cover' }}
              />
            )}
            <div className="card-header bg-secondary" style={{ flexGrow: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{article.title}</h3>
            </div>
            <div className="card-body" style={{ flexGrow: 1 }}>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                {new Date(article.published_at).toLocaleDateString()}
              </p>
              <p>{article.excerpt}</p>
              <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                <Link to={`/articles/${article.id}`} className="button button-small button-primary">Read More</Link>
              </div>
            </div>
          </div>
        ))}
        {articles.length === 0 && (
          <p>No articles published yet.</p>
        )}
      </div>
    </div>
  )
}
