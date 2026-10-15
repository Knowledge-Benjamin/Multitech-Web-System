import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import './StudentLogin.css'

export default function StudentLogin() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/student-auth/login`, {
        email: formData.email,
        student_number: formData.email,
        password: formData.password
      })
      
      if (res.data.success) {
        localStorage.setItem('studentToken', res.data.token)
        localStorage.setItem('studentUser', JSON.stringify(res.data.student))
        navigate('/student/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="student-login-wrapper">
      <a href="/" className="student-login-back">
        ← Back to Home
      </a>
      <div className="student-login-card">
        <div className="student-login-header">
          <h2>Student Portal</h2>
          <p>Login to access your academic dashboard</p>
        </div>

        {error && <div className="student-login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="student-login-form">
          <div className="student-login-group">
            <label htmlFor="email">Email Address or Student Number</label>
            <input
              type="text"
              id="email"
              className="student-login-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. cbrainic@gmail.com or MBS/2026/0001"
              required
            />
          </div>

          <div className="student-login-group">
            <label htmlFor="password">Password (Reference Number)</label>
            <input
              type="password"
              id="password"
              className="student-login-input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className="student-login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
        <div className="student-login-footer">
          <Link to="/apply">New student? Apply here.</Link>
        </div>
      </div>
    </div>
  )
}
