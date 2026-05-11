import axiosInstance from './axiosInstance'

/**
 * POST /api/registration/
 * Body: { course_ids: [1, 2], semester: "2025/2026 S2" }
 * Enroll a student in one or more courses.
 */
export const enroll = async (courseIds, semester) => {
  const { data } = await axiosInstance.post('/registration/', {
    course_ids: courseIds,
    semester,
  })
  return data
}

/**
 * GET /api/registration/mine/
 * Params: semester, status
 */
export const getMyRegistrations = async (params = {}) => {
  const { data } = await axiosInstance.get('/registration/mine/', { params })
  return data
}

/**
 * DELETE /api/registration/:id/drop/
 * Drop (unenroll from) a course.
 */
export const dropCourse = async (registrationId) => {
  const { data } = await axiosInstance.delete(`/registration/${registrationId}/drop/`)
  return data
}

/**
 * POST /api/registration/pay/
 * Body: { registration_ids, amount, method, reference, semester }
 */
export const submitPayment = async (payload) => {
  const { data } = await axiosInstance.post('/registration/pay/', payload)
  return data
}

/**
 * GET /api/registration/payments/
 * Returns the student's payment history.
 */
export const getMyPayments = async () => {
  const { data } = await axiosInstance.get('/registration/payments/')
  return data
}

/**
 * GET /api/registration/roster/:courseId/
 * Instructor / admin: get all enrolled students for a course.
 */
export const getCourseRoster = async (courseId) => {
  const { data } = await axiosInstance.get(`/registration/roster/${courseId}/`)
  return data
}

/**
 * GET /api/registration/all/
 * Admin only. Params: student, course, semester, status
 */
export const getAllRegistrations = async (params = {}) => {
  const { data } = await axiosInstance.get('/registration/all/', { params })
  return data
}