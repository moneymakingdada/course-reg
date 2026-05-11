import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { roleRedirect } from '../../utils/roleRedirect'


export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login(form.email, form.password)
      navigate(roleRedirect(user.role), { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">

        {/* Header */}
        <div className="login-header">
          <p className="login-title">
            Course<span>Reg</span>
          </p>
          <p className="login-subtitle">Sign in to continue</p>
        </div>

        {/* Error */}
        {error && <div className="error-box">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">

          {/* Email */}
          <div>
            <label className="form-label">Email address</label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="you@university.edu"
              className="form-input"
            />
          </div>

          {/* Password */}
          <div>
            <div className="password-row">
              <label className="form-label">Password</label>
              <Link to="/forgot-password" className="link">
                Forgot password?
              </Link>
            </div>

            <input
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="form-input"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`submit-btn ${loading ? 'disabled' : ''}`}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Footer */}
        <p className="login-footer">
          Don't have an account?{' '}
          <Link to="/signup" className="link">
            Sign up
          </Link>
        </p>

      </div>
    </div>
  )
}