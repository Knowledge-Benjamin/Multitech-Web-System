import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import './StudentLogin.css'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', {
        username,
        password
      })

      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.token)
        localStorage.setItem('adminUser', JSON.stringify(response.data.admin))
        navigate('/admin/dashboard')
      } else {
        setError(response.data.message || 'Login failed')
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
          <h2>Admin Portal</h2>
          <p>Multitech Business School — Staff Access</p>
        </div>

        {error && <div className="student-login-error">{error}</div>}

        <form onSubmit={handleLogin} className="student-login-form">
          <div className="student-login-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className="student-login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="student-login-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="student-login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="student-login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

