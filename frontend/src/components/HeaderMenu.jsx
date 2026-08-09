import { NavLink } from 'react-router-dom'

export default function HeaderMenu({ isMenuOpen, onLinkClick }) {
  const navCls = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`
  const btnOutlineCls = ({ isActive }) => `nav-link button button-outline${isActive ? ' active' : ''}`

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
      <NavLink to="/student/login" className={btnOutlineCls} onClick={onLinkClick}>
        Student Login
      </NavLink>
      <NavLink to="/apply" className="nav-link button button-accent" onClick={onLinkClick}>
        Apply Now
      </NavLink>
    </nav>
  )
}
