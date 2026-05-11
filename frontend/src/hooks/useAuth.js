import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/**
 * useAuth()
 * Returns everything from AuthContext.
 * Throws if used outside <AuthProvider>.
 *
 * Usage:
 *   const { user, isStudent, login, logout } = useAuth()
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return context
}