import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import HeaderMenu from './HeaderMenu'
import './Header.css'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const setHeaderHeight = () => {
      const el = headerRef.current
      const h = el ? el.offsetHeight : 110
      document.documentElement.style.setProperty('--header-height', `${h}px`)
    }

    setHeaderHeight()
    window.addEventListener('resize', setHeaderHeight)
    return () => window.removeEventListener('resize', setHeaderHeight)
  }, [isMenuOpen])

  return (
    <header ref={headerRef} className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-container container">
        <div className="header-logo">
          <Link to="/" className="logo-link">
            <img
              src="/logo_asset.png"
              alt="Multitech Business School"
              className="logo-image"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
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

        <HeaderMenu isMenuOpen={isMenuOpen} onLinkClick={() => setIsMenuOpen(false)} />
      </div>
    </header>
  )
}
