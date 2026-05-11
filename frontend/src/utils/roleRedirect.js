/**
 * roleRedirect(role)
 * Returns the default landing path for a given user role.
 * Used after login to send each role to their own dashboard.
 *
 * Usage:
 *   const path = roleRedirect(user.role)
 *   navigate(path, { replace: true })
 */
export function roleRedirect(role) {
  switch (role) {
    case 'student':
      return '/student/dashboard'
    case 'instructor':
      return '/instructor/dashboard'
    case 'admin':
      return '/admin/dashboard'
    default:
      return '/login'
  }
}

/**
 * getRoleTheme(role)
 * Returns a CSS color token for role-specific theming.
 */
export function getRoleTheme(role) {
  switch (role) {
    case 'student':
      return { primary: '#534AB7', bg: '#F5F4FE', sidebar: '#3C3489', text: '#26215C' }
    case 'instructor':
      return { primary: '#0F6E56', bg: '#F0FBF7', sidebar: '#085041', text: '#04342C' }
    case 'admin':
      return { primary: '#854F0B', bg: '#FFFBF5', sidebar: '#633806', text: '#412402' }
    default:
      return { primary: '#534AB7', bg: '#F5F4FE', sidebar: '#3C3489', text: '#26215C' }
  }
}

/**
 * getInitials(fullName)
 * Returns 2-letter initials for avatar display.
 */
export function getInitials(fullName = '') {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

/**
 * formatSemester(semesterString)
 * Formats a raw semester string for display.
 */
export function formatSemester(sem = '') {
  return sem.replace('S1', 'Semester 1').replace('S2', 'Semester 2')
}

/**
 * formatCurrency(amount)
 * Formats a number as Ghanaian Cedi.
 */
export function formatCurrency(amount) {
  return `GHS ${parseFloat(amount).toFixed(2)}`
}