import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getRoleTheme } from '../utils/roleRedirect'


const SIDEBAR_LINKS = {
  student: [
    { label: 'Overview', to: '/student/dashboard' },
    {label: 'Course Catalog', to: '/student/catalog' },
    { label: 'My Courses', to: '/student/my-courses' },
    { label: 'Register', to: '/student/register' },
    { label: 'Waitlist', to: '/student/waitlist' },
    { label: 'Schedule', to: '/student/schedule' },
    { label: 'Payments', to: '/student/payments' },
    { label: 'Settings', to: '/student/settings' },
  ],
  instructor: [
    { label: 'Overview', to: '/instructor/dashboard' },
    { label: 'Manage Courses', to: '/instructor/courses' },
    { label: 'Grade Entry', to: '/instructor/grades' },
    { label: 'Attendance', to: '/instructor/attendance' },
    { label: 'Waitlists', to: '/instructor/waitlists' },
    { label: 'Settings', to: '/instructor/settings' },
  ],
  admin: [
    { label: 'Analytics',     to: '/admin/dashboard',     section: 'Overview' },
    { label: 'Registrations', to: '/admin/registrations' },
    { label: 'Payments',      to: '/admin/payments' },
    { label: 'Departments',   to: '/admin/departments',   section: 'Management' },
    { label: 'Students',      to: '/admin/students' },
    { label: 'Courses',       to: '/admin/courses' },
    { label: 'Instructors',   to: '/admin/instructors' },
    { label: 'Waitlists',     to: '/admin/waitlists' },
    { label: 'Export Data',   to: '/admin/export',        section: 'Reports' },
    { label: 'Audit Log',     to: '/admin/audit' },
    { label: 'Settings',      to: '/admin/settings' },
  ],
}

export default function Sidebar() {
  const { user } = useAuth()
  const location = useLocation()
  const theme = getRoleTheme(user?.role)
  const links = SIDEBAR_LINKS[user?.role] || []

  let lastSection = null

  return (
    <aside
      className="sidebar"
      style={{ background: theme.sidebar }} // dynamic
    >
      {links.map((link) => {
        const isActive = location.pathname === link.to
        const showLabel = link.section && link.section !== lastSection

        if (link.section) lastSection = link.section

        return (
          <div key={link.to}>
            {/* Section label */}
            {showLabel && (
              <p className="sidebar-section">
                {link.section}
              </p>
            )}

            {/* Link */}
            <Link
              to={link.to}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-dot" />
              {link.label}
            </Link>
          </div>
        )
      })}
    </aside>
  )
}