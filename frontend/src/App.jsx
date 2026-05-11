import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }   from './context/AuthContext'
import { CourseProvider } from './context/CourseContext'

import ProtectedRoute  from './components/ProtectedRoute'
import ErrorBoundary   from './components/ErrorBoundary'
import Navbar          from './components/Navbar'
import Sidebar         from './components/Sidebar'

// Auth
import Login  from './pages/auth/Login'
import Signup from './pages/auth/Signup'

// Student
import StudentDashboard from './pages/student/StudentDashboard'
//import MyCourses        from './pages/student/MyCourses'
import CourseCatalog    from './pages/student/CourseCatalog'
import Registration     from './pages/student/Registration'
import Waitlist         from './pages/student/Waitlist'

// Instructor
import InstructorDashboard from './pages/instructor/InstructorDashboard'
import CourseManagement    from './pages/instructor/CourseManagement'
import InstructorWaitlist  from './pages/instructor/InstructorWaitlist'

// Admin
import AdminDashboard        from './pages/admin/AdminDashboard'
import RegistrationMonitor   from './pages/admin/RegistrationMonitor'
import PaymentsMonitor       from './pages/admin/PaymentsMonitor'
import DepartmentManagement  from './pages/admin/DepartmentManagement'
import AdminWaitlist         from './pages/admin/AdminWaitlist'

import './styles/global.css'

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CourseProvider>
          <Routes>

            {/* ── Public ─────────────────────────────────────────────────── */}
            <Route path="/login"        element={<Login />} />
            <Route path="/signup"       element={<Signup />} />
            <Route path="/"             element={<RootRedirect />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* ── Student ────────────────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/student/dashboard"
                element={<AppLayout><StudentDashboard /></AppLayout>} />
              <Route path="/student/catalog"
                element={<AppLayout><CourseCatalog /></AppLayout>} />
             <Route path="/student/my-courses"
                element={<AppLayout><CourseCatalog /></AppLayout>} />
              <Route path="/student/register"
                element={<AppLayout><Registration /></AppLayout>} />
              <Route path="/student/waitlist"
                element={<AppLayout><Waitlist /></AppLayout>} />
            </Route>

            {/* ── Instructor ─────────────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['instructor']} />}>
              <Route path="/instructor/dashboard"
                element={<AppLayout><InstructorDashboard /></AppLayout>} />
              <Route path="/instructor/courses"
                element={<AppLayout><CourseManagement /></AppLayout>} />
              <Route path="/instructor/courses/:courseId"
                element={<AppLayout><InstructorDashboard /></AppLayout>} />
              <Route path="/instructor/waitlists"
                element={<AppLayout><InstructorWaitlist /></AppLayout>} />
            </Route>

            {/* ── Admin ──────────────────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard"
                element={<AppLayout><AdminDashboard /></AppLayout>} />
              <Route path="/admin/registrations"
                element={<AppLayout><RegistrationMonitor /></AppLayout>} />
              <Route path="/admin/payments"
                element={<AppLayout><PaymentsMonitor /></AppLayout>} />
              <Route path="/admin/departments"
                element={<AppLayout><DepartmentManagement /></AppLayout>} />
              <Route path="/admin/waitlists"
                element={<AppLayout><AdminWaitlist /></AppLayout>} />
            </Route>

            {/* ── 404 ────────────────────────────────────────────────────── */}
            <Route path="*" element={<NotFoundPage />} />

          </Routes>
        </CourseProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

function RootRedirect() {
  const stored = localStorage.getItem('user')
  if (!stored) return <Navigate to="/login" replace />
  try {
    const { role } = JSON.parse(stored)
    if (role === 'student')    return <Navigate to="/student/dashboard"    replace />
    if (role === 'instructor') return <Navigate to="/instructor/dashboard" replace />
    if (role === 'admin')      return <Navigate to="/admin/dashboard"      replace />
  } catch { /* fall through */ }
  return <Navigate to="/login" replace />
}

function UnauthorizedPage() {
  return (
    <div className="util-page">
      <p className="util-page__icon">🚫</p>
      <p className="util-page__title">Access denied</p>
      <p className="util-page__sub">You don't have permission to view this page.</p>
      <a href="/login" className="util-page__link">Back to login</a>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="util-page">
      <p className="util-page__icon">404</p>
      <p className="util-page__title">Page not found</p>
      <a href="/" className="util-page__link">Go home</a>
    </div>
  )
}