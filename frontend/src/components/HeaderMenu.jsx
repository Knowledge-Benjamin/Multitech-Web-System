import { Link } from 'react-router-dom'

export default function HeaderMenu({ isMenuOpen, onLinkClick }) {
  return (
    <nav className={`header-nav ${isMenuOpen ? 'active' : ''}`}>
      <Link to="/" className="nav-link" onClick={onLinkClick}>
        Home
      </Link>
      <Link to="/programmes" className="nav-link" onClick={onLinkClick}>
        Programmes
      </Link>
      <Link to="/articles" className="nav-link" onClick={onLinkClick}>
        Articles
      </Link>
      <Link to="/student/login" className="nav-link button button-outline" onClick={onLinkClick}>
        Student Login
      </Link>
      <Link to="/programmes" className="nav-link button button-accent" onClick={onLinkClick}>
        Apply Now
      </Link>
    </nav>
  )
}
