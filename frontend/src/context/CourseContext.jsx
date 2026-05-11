import { createContext, useState, useCallback } from 'react'
import { getMyRegistrations } from '../api/registration'
import { getCourses }         from '../api/courses'

export const CourseContext = createContext(null)

export function CourseProvider({ children }) {
  // Registration cart — courses the student has selected before confirming
  const [cart,        setCart]        = useState([])       // array of Course objects
  const [enrollments, setEnrollments] = useState([])       // confirmed Registration objects
  const [semester,    setSemester]    = useState('')        // active semester string
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)

  // ── Cart actions ────────────────────────────────────────────────────────
  const addToCart = useCallback((course) => {
    setCart((prev) => {
      if (prev.find((c) => c.id === course.id)) return prev  // already in cart
      return [...prev, course]
    })
  }, [])

  const removeFromCart = useCallback((courseId) => {
    setCart((prev) => prev.filter((c) => c.id !== courseId))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const isInCart = useCallback(
    (courseId) => cart.some((c) => c.id === courseId),
    [cart]
  )

  // ── Total credits in cart ───────────────────────────────────────────────
  const cartCredits = cart.reduce((sum, c) => sum + (c.credits || 0), 0)

  // ── Fetch confirmed enrollments from API ────────────────────────────────
  const fetchEnrollments = useCallback(async (semesterParam) => {
    setLoadingEnrollments(true)
    try {
      const data = await getMyRegistrations(
        semesterParam ? { semester: semesterParam, status: 'enrolled' } : { status: 'enrolled' }
      )
      setEnrollments(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      console.error('Failed to fetch enrollments', err)
    } finally {
      setLoadingEnrollments(false)
    }
  }, [])

  // ── Check if already enrolled ───────────────────────────────────────────
  const isEnrolled = useCallback(
    (courseId) => enrollments.some((r) => r.course === courseId && r.status === 'enrolled'),
    [enrollments]
  )

  // ── Total enrolled credits ──────────────────────────────────────────────
  const enrolledCredits = enrollments
    .filter((r) => r.status === 'enrolled')
    .reduce((sum, r) => sum + (r.credits || 0), 0)

  const value = {
    cart,
    cartCredits,
    addToCart,
    removeFromCart,
    clearCart,
    isInCart,

    enrollments,
    enrolledCredits,
    loadingEnrollments,
    fetchEnrollments,
    isEnrolled,

    semester,
    setSemester,
  }

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
}