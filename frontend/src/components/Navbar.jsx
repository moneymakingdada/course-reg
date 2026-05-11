import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import NotificationBell from './NotificationBell'
import { getRoleTheme, getInitials } from '../utils/roleRedirect'


const NAV_LINKS = {
  student: [
    { label: 'Dashboard', to: '/student/dashboard' },
    { label: 'Catalog', to: '/student/catalog' },
    { label: 'My Courses', to: '/student/my-courses' },
    { label: 'Waitlist', to: '/student/waitlist' },
  ],
  instructor: [
    { label: 'Dashboard', to: '/instructor/dashboard' },
    { label: 'My Courses', to: '/instructor/courses' },
    { label: 'Grades', to: '/instructor/grades' },
  ],
  admin: [
    { label: 'Analytics', to: '/admin/dashboard' },
    { label: 'Students', to: '/admin/students' },
    { label: 'Courses', to: '/admin/courses' },
    { label: 'Reports', to: '/admin/reports' },
  ],
}

export default function Navbar() {
  const { user, logout, isAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = getRoleTheme(user?.role)
  const links = NAV_LINKS[user?.role] || []

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  if (!isAuth) return null

  return (
    <nav
      className="navbar"
      style={{ background: theme.primary }} // keep dynamic
    >
      {/* Logo */}
      <Link to="/" className="navbar-logo">
        <span className="navbar-title">
          CourseReg
          <span className="navbar-role">
            · {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
          </span>
        </span>
      </Link>

      {/* Nav links */}
      <div className="navbar-links">
        {links.map((link) => {
          const isActive = location.pathname === link.to
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          )
        })}

        <div className="navbar__right">
          {/* Notification bell — shown for all roles */}
          <NotificationBell />
        </div>

        {/* Avatar + logout */}
        <div className="navbar-right">
          <div className="navbar-avatar">
            {getInitials(
              user?.full_name ||
              `${user?.first_name} ${user?.last_name}`
            )}
          </div>

          <button
            onClick={handleLogout}
            className="navbar-btn"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}