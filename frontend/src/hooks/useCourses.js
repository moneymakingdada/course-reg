import { useState, useEffect, useCallback } from 'react'
import { getCourses, getDepartments } from '../api/courses'

/**
 * useCourses(initialParams)
 * Fetches the course catalog with optional filtering params.
 * Re-fetches whenever params change.
 */
export function useCourses(initialParams = {}) {
  const [courses, setCourses] = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [params,  setParams]  = useState(initialParams)

  const fetchCourses = useCallback(async (queryParams) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCourses(queryParams)
      if (Array.isArray(data)) {
        setCourses(data)
        setTotal(data.length)
      } else {
        setCourses(data.results ?? [])
        setTotal(data.count   ?? 0)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load courses.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCourses(params)
  }, [params, fetchCourses])

  const refetch = useCallback(() => fetchCourses(params), [params, fetchCourses])

  return { courses, total, loading, error, params, setParams, refetch }
}

/**
 * useDepartments()
 * Fetches the list of departments once on mount.
 * Safely handles both plain array and paginated { count, results } responses.
 */
export function useDepartments() {
  const [departments, setDepartments] = useState([])
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    setLoading(true)
    getDepartments()
      .then((data) => {
        // Backend may return plain array or paginated { count, results }
        setDepartments(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { departments, loading }
}
