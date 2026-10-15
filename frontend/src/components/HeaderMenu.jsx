import { NavLink, useLocation } from 'react-router-dom'

export default function HeaderMenu({ isMenuOpen, onLinkClick }) {
  const location = useLocation()
  const isPortalRoute = ['/portal/login', '/login', '/student/login', '/lecturer/login'].includes(location.pathname)

  const navCls = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`
  const btnOutlineCls = ({ isActive }) => `nav-link button button-outline${isActive || isPortalRoute ? ' active' : ''}`

  return (
    <nav className={`header-nav ${isMenuOpen ? 'active' : ''}`}>
      <NavLink to="/" end className={navCls} onClick={onLinkClick}>
        Home
      </NavLink>
      <NavLink to="/programmes" className={navCls} onClick={onLinkClick}>
        Programmes
      </NavLink>
      <NavLink to="/about" className={navCls} onClick={onLinkClick}>
        About
      </NavLink>
      <NavLink to="/articles" className={navCls} onClick={onLinkClick}>
        Articles
      </NavLink>
      <NavLink to="/portal/login" className={btnOutlineCls} onClick={onLinkClick}>
        Portal Login
      </NavLink>
      <NavLink to="/apply" className="nav-link button button-accent" onClick={onLinkClick}>
        Apply Now
      </NavLink>
    </nav>
  )
}
