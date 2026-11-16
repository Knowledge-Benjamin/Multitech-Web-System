import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import api from '../services/api'
import './StudentLogin.css'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
    <main className="auth-screen auth-screen-admin">
      <Link to="/" className="auth-back-link">
        <ArrowLeft size={16} />
        <span>Back to website</span>
      </Link>

      <div className="auth-layout">
        <section className="auth-intro" aria-label="Multitech administration portal">
          <div className="auth-brand-lockup">
            <img src="/logo_asset.png" alt="" className="auth-brand-logo" />
            <span>Multitech<br />Business School</span>
          </div>

          <p className="auth-eyebrow">Institutional administration</p>
          <h1>Lead with clarity. <em>Move forward.</em></h1>
          <p className="auth-intro-copy">
            Manage the work behind every student experience from one secure workspace.
          </p>
          <div className="auth-assurance">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Authorized staff access only</span>
          </div>
        </section>

        <section className="auth-card" aria-labelledby="admin-login-title">
          <div className="auth-card-heading">
            <span className="auth-card-eyebrow">Staff access</span>
            <h2 id="admin-login-title">Sign in to admin</h2>
            <p>Use your administrator credentials to continue.</p>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-field">
              <label htmlFor="admin-username">Username</label>
              <input
                type="text"
                id="admin-username"
                className="auth-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="admin-password">Password</label>
              <div className="auth-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="admin-password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? <Loader2 size={18} className="auth-spinner" aria-hidden="true" /> : null}
              <span>{loading ? 'Signing in…' : 'Sign in securely'}</span>
            </button>
          </form>
          <p className="auth-privacy-note">This area is restricted to authorized staff.</p>
        </section>
      </div>
    </main>
  )
}

