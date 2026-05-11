import { createContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin, logout as apiLogout, getProfile } from '../api/auth'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)   // full user object
  const [loading, setLoading] = useState(true)   // true while rehydrating from localStorage

  // ── Rehydrate on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('user')
    const access = localStorage.getItem('access')
    if (stored && access) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  // ── Login ───────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password)
    setUser(data.user)
    return data.user
  }, [])

  // ── Logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  // ── Refresh profile (call after updating name etc.) ─────────────────────
  const refreshProfile = useCallback(async () => {
    const profile = await getProfile()
    setUser(profile)
    localStorage.setItem('user', JSON.stringify(profile))
    return profile
  }, [])

  // ── Convenience role flags ──────────────────────────────────────────────
  const isStudent    = user?.role === 'student'
  const isInstructor = user?.role === 'instructor'
  const isAdmin      = user?.role === 'admin'
  const isAuth       = !!user

  const value = {
    user,
    loading,
    isAuth,
    isStudent,
    isInstructor,
    isAdmin,
    login,
    logout,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}