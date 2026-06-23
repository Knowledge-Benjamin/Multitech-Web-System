import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Header.css'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-container container">
        <div className="header-logo">
          <Link to="/" className="logo-link">
            <img src="/logo_asset.png" alt="Multitech Business School" className="logo-image" />
          </Link>
        </div>

        <button
          className={`hamburger ${isMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`header-nav ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link" onClick={() => setIsMenuOpen(false)}>
            Home
          </Link>
          <Link to="/programmes" className="nav-link" onClick={() => setIsMenuOpen(false)}>
            Programmes
          </Link>
          <Link to="/student/login" className="nav-link button button-outline" onClick={() => setIsMenuOpen(false)}>
            Student Login
          </Link>
          <Link to="/programmes" className="nav-link button button-accent" onClick={() => setIsMenuOpen(false)}>
            Apply Now
          </Link>
        </nav>
      </div>
    </header>
  )
}
