import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './StudentLogin.css'

const API = import.meta.env.VITE_API_URL

export default function LecturerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API}/lecturer/login`, { email, password })
      localStorage.setItem('lecturerToken', res.data.token)
      localStorage.setItem('lecturerInfo', JSON.stringify(res.data.lecturer))
      navigate('/lecturer/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.')
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
          <h2>Lecturer Portal</h2>
          <p>Multitech Business School — Faculty Access</p>
        </div>

        {error && <div className="student-login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="student-login-form">
          <div className="student-login-group">
            <label htmlFor="lecturer-email">Email Address</label>
            <input
              id="lecturer-email"
              type="email"
              className="student-login-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="lecturer@multitech.ac.ug"
              required
            />
          </div>
          <div className="student-login-group">
            <label htmlFor="lecturer-password">Password</label>
            <input
              id="lecturer-password"
              type="password"
              className="student-login-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="student-login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

