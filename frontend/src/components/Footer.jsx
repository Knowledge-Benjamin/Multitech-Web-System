import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './Footer.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState({ loading: false, success: null, message: '' })

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!newsletterEmail || !newsletterEmail.trim()) return

    setNewsletterStatus({ loading: true, success: null, message: '' })
    try {
      const res = await axios.post(`${API_BASE_URL}/emails/mailing-list/subscribe`, {
        email: newsletterEmail.trim(),
        source: 'footer',
        listName: 'Multitech Insider'
      })
      setNewsletterStatus({
        loading: false,
        success: true,
        message: res.data.message || 'Thank you for subscribing to Multitech Insider!'
      })
      setNewsletterEmail('')
      setTimeout(() => {
        setNewsletterStatus({ loading: false, success: null, message: '' })
      }, 5000)
    } catch (err) {
      setNewsletterStatus({
        loading: false,
        success: false,
        message: err.response?.data?.message || 'Failed to subscribe. Please try again.'
      })
    }
  }

  return (
    <footer className="scope-footer footer">
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

        <div className="footer-section footer-newsletter">
          <h4>Multitech Insider</h4>
          <p>
            Subscribe to our mailing list for the latest campus news, intake announcements, and educational insights.
          </p>
          <form onSubmit={handleSubscribe} className="footer-newsletter-form">
            <div className="footer-input-group">
              <input
                type="email"
                placeholder="Enter your email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={newsletterStatus.loading}>
                {newsletterStatus.loading ? '...' : 'Join'}
              </button>
            </div>
            {newsletterStatus.message && (
              <div className={`footer-newsletter-msg ${newsletterStatus.success ? 'success' : 'error'}`}>
                {newsletterStatus.message}
              </div>
            )}
          </form>
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
