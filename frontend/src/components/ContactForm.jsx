import { useState } from 'react'
import axios from 'axios'
import './ContactForm.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export default function ContactForm({ pageUrl }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    subscribeMailingList: true
  })
  const [status, setStatus] = useState({ loading: false, success: null, message: '' })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus({ loading: true, success: null, message: '' })

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setStatus({ loading: false, success: false, message: 'All fields are required.' })
      return
    }

    try {
      await axios.post(`${API_BASE_URL}/emails/contact`, {
        ...formData,
        pageUrl
      })
      setFormData({ name: '', email: '', subject: '', message: '', subscribeMailingList: true })
      setStatus({ 
        loading: false, 
        success: true, 
        message: formData.subscribeMailingList 
          ? 'Message sent successfully, and you have been subscribed to Multitech Insider!'
          : 'Message sent successfully. We will reply soon.' 
      })
    } catch (error) {
      const errStatus = error.response?.status
      const safeMessage =
        errStatus && errStatus >= 400 && errStatus < 500
          ? (error.response?.data?.message || 'Please check your details and try again.')
          : 'Failed to send your message. Please try again later.'
      setStatus({ loading: false, success: false, message: safeMessage })
    }
  }

  return (
    <form className="scope-contactform contact-form" onSubmit={handleSubmit}>
      <div className="contact-form-row">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required />
      </div>

      <div className="contact-form-row">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
      </div>

      <div className="contact-form-row">
        <label htmlFor="subject">Subject</label>
        <input id="subject" name="subject" type="text" value={formData.subject} onChange={handleChange} required />
      </div>

      <div className="contact-form-row">
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" value={formData.message} onChange={handleChange} rows="6" required />
      </div>

      <div className="contact-form-subscribe">
        <label htmlFor="subscribeMailingList" className="subscribe-checkbox-label">
          <input
            id="subscribeMailingList"
            name="subscribeMailingList"
            type="checkbox"
            checked={formData.subscribeMailingList}
            onChange={handleChange}
          />
          <span>
            Subscribe to our mailing list: <strong>Multitech Insider</strong> &mdash; receive the latest campus news, admission notices, and educational insights.
          </span>
        </label>
      </div>

      <div className="contact-form-actions">
        <button type="submit" className="button button-primary" disabled={status.loading}>
          {status.loading ? 'Sending...' : 'Send Message'}
        </button>
      </div>

      {status.message && (
        <div className={`contact-form-feedback ${status.success ? 'success' : 'error'}`}>
          {status.message}
        </div>
      )}
    </form>
  )
}
