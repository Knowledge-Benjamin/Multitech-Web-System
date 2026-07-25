import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './AdminLogin.css'

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
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <span className="logo-icon">🎓</span>
          <h1>Lecturer Portal</h1>
          <p>Multitech Business School</p>
        </div>

        {error && <div className="admin-login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="lecturer-email">Email Address</label>
            <input
              id="lecturer-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="lecturer@multitech.ac.ug"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="lecturer-password">Password</label>
            <input
              id="lecturer-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="admin-login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
