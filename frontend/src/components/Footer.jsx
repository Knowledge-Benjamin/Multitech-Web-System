import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-content container">
        <div className="footer-section">
          <h4>Contact Information</h4>
          <p>
            <strong>Kampala Campus:</strong><br />
            Plot 345 Bukesa, off Sir Apollo Kaggwa Road<br />
            P.O Box 3211 Kampala, Uganda<br />
            Phone: +256 774 461 072 / +256 756 779 900
          </p>
          <p>
            <Link to="/contact" className="footer-contact-link">Send us a message</Link><br />
            <a href="mailto:inquiries@multitech.ac.ug">inquiries@multitech.ac.ug</a>
          </p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li><a href="#elibrary">E-Library</a></li>
            <li><a href="#elearning">E-Learning</a></li>
            <li><a href="/map">Location Map</a></li>
            <li><a href="#programmes">Programmes</a></li>
            <li><a href="#about">About Us</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Follow Us</h4>
          <div className="social-links">
            <a href="https://www.tiktok.com/@multitechbusinessschool" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <i className="fab fa-tiktok"></i>
            </a>
            <a href="https://www.youtube.com/@MULTITECHBUSINESSSCHOOL" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <i className="fab fa-youtube"></i>
            </a>
            <a href="https://www.facebook.com/share/1685CWr8rk/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="fab fa-facebook"></i>
            </a>
            <a href="https://x.com/MULTITECHBS" target="_blank" rel="noopener noreferrer" aria-label="X">
              <i className="fab fa-x-twitter"></i>
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} Multitech Business School. All Rights Reserved.</p>
      </div>
    </footer>
  )
}
