import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * <ProtectedRoute allowedRoles={['student']} />
 * - Redirects to /login if not authenticated.
 * - Redirects to /unauthorized if the user's role is not in allowedRoles.
 * - Renders <Outlet /> (child routes) if all checks pass.
 *
 * Usage in App.jsx:
 *   <Route element={<ProtectedRoute allowedRoles={['student']} />}>
 *     <Route path="/student/dashboard" element={<StudentDashboard />} />
 *   </Route>
 */
export default function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuth, user, loading } = useAuth()

  // While rehydrating from localStorage, render nothing to avoid flash
  if (loading) return null

  if (!isAuth) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}