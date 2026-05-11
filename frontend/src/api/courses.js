import axiosInstance from './axiosInstance'

/**
 * Strip out empty string / null / undefined params before sending,
 * so the backend never receives ?search=&department= noise.
 */
function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  )
}

/**
 * GET /api/courses/
 * Params: search, department, level, credits, available, semester, ordering, page
 */
export const getCourses = async (params = {}) => {
  const { data } = await axiosInstance.get('/courses/', { params: cleanParams(params) })
  return data  // { count, next, previous, results: [...] }
}

/**
 * GET /api/courses/:id/
 */
export const getCourseById = async (id) => {
  const { data } = await axiosInstance.get(`/courses/${id}/`)
  return data
}

/**
 * GET /api/courses/mine/
 */
export const getMyCourses = async () => {
  const { data } = await axiosInstance.get('/courses/mine/')
  return data
}

/**
 * GET /api/courses/departments/
 */
export const getDepartments = async () => {
  const { data } = await axiosInstance.get('/courses/departments/')
  return data
}

/**
 * POST   /api/courses/
 * PATCH  /api/courses/:id/
 * DELETE /api/courses/:id/
 */
export const createCourse = async (payload) => {
  const { data } = await axiosInstance.post('/courses/', payload)
  return data
}

export const updateCourse = async (id, payload) => {
  const { data } = await axiosInstance.patch(`/courses/${id}/`, payload)
  return data
}

export const deleteCourse = async (id) => {
  const { data } = await axiosInstance.delete(`/courses/${id}/`)
  return data
}
