import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { roleRedirect } from '../../utils/roleRedirect'


const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'admin', label: 'Admin' },
]

export default function Signup() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState('student')
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: '',
    student_id: '',
    level: 100,
    staff_id: '',
    department: '',
    title: 'Dr.',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { register } = await import('../../api/auth')
      const data = await register({ ...form, role })
      alert('Account Created Successfully')
      // optional: login(data.token)
      navigate(roleRedirect(data.user.role), { replace: true })
    } catch (err) {
      const errData = err.response?.data
      setError(
        typeof errData === 'object'
          ? Object.values(errData).flat().join(' ')
          : 'Registration failed.'
      )
    } finally {
      setLoading(false)
    }
  }

  const field = (name, label, type = 'text', placeholder = '') => (
    <div>
      <label className="form-label">{label}</label>
      <input
        name={name}
        type={type}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        className="form-input"
      />
    </div>
  )

  return (
    <div className="signup-container">
      <div className="signup-card">

        {/* Header */}
        <div className="signup-header">
          <p className="signup-title">
            Course<span>Reg</span>
          </p>
          <p className="signup-subtitle">Create your account</p>
        </div>

        {/* Role toggle */}
        <div className="role-toggle">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`role-btn ${role === r.value ? 'active' : ''}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <div className="error-box">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="signup-form">

          {/* Name */}
          <div className="grid-2">
            {field('first_name', 'First name', 'text', 'Kwame')}
            {field('last_name', 'Last name', 'text', 'Asante')}
          </div>

          {/* Role-specific fields */}
          {role === 'student' &&
            field('student_id', 'Student ID', 'text', '20241034')}

          {role === 'instructor' &&
            field('staff_id', 'Staff ID', 'text', 'STAFF001')}

          {role === 'instructor' &&
            field('department', 'Department', 'text', 'Computer Science')}

          {/* Email */}
          {field('email', 'Email address', 'email', 'you@university.edu')}

          {/* Passwords */}
          <div className="grid-2">
            {field('password', 'Password', 'password', '••••••••')}
            {field(
              'confirm_password',
              'Confirm password',
              'password',
              '••••••••'
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`submit-btn ${loading ? 'disabled' : ''}`}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {/* Footer */}
        <p className="signup-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}