import axiosInstance from './axiosInstance'

// ── Student ──────────────────────────────────────────────────────────────────

export const joinWaitlist       = (courseId, semester) =>
  axiosInstance.post('/waitlist/', { course_id: courseId, semester }).then(r => r.data)

export const getMyWaitlist      = () =>
  axiosInstance.get('/waitlist/mine/').then(r => r.data)

export const leaveWaitlist      = (entryId) =>
  axiosInstance.delete(`/waitlist/${entryId}/`).then(r => r.data)

export const acceptSpot         = (entryId) =>
  axiosInstance.post(`/waitlist/${entryId}/accept/`).then(r => r.data)

// ── Notifications ─────────────────────────────────────────────────────────────

export const getNotifications   = (unreadOnly = false) =>
  axiosInstance.get('/waitlist/notifications/', {
    params: unreadOnly ? { unread: true } : {}
  }).then(r => r.data)

export const markNotificationRead = (id) =>
  axiosInstance.patch(`/waitlist/notifications/${id}/read/`).then(r => r.data)

export const markAllNotificationsRead = () =>
  axiosInstance.patch('/waitlist/notifications/read-all/').then(r => r.data)

// ── Instructor ────────────────────────────────────────────────────────────────

/** GET  /api/waitlist/course/:id/          — list waitlist for one course */
export const getCourseWaitlist  = (courseId, params = {}) =>
  axiosInstance.get(`/waitlist/course/${courseId}/`, { params }).then(r => r.data)

/** POST /api/waitlist/course/:id/notify-next/ — notify next student */
export const notifyNextStudent  = (courseId) =>
  axiosInstance.post(`/waitlist/course/${courseId}/notify-next/`).then(r => r.data)

/** DELETE /api/waitlist/course/:cId/entry/:eId/ — remove a student */
export const removeFromWaitlist = (courseId, entryId, reason = '') =>
  axiosInstance.delete(`/waitlist/course/${courseId}/entry/${entryId}/`, {
    data: { reason }
  }).then(r => r.data)

/** POST /api/waitlist/course/:cId/entry/:eId/enroll/ — enroll directly */
export const enrollFromWaitlist = (courseId, entryId) =>
  axiosInstance.post(`/waitlist/course/${courseId}/entry/${entryId}/enroll/`).then(r => r.data)

// ── Admin ─────────────────────────────────────────────────────────────────────

/** GET  /api/waitlist/all/                — all waitlist entries */
export const getAllWaitlists    = (params = {}) =>
  axiosInstance.get('/waitlist/all/', { params }).then(r => r.data)

/** DELETE /api/waitlist/course/:id/clear/ — clear entire course waitlist */
export const clearCourseWaitlist = (courseId, reason = '') =>
  axiosInstance.delete(`/waitlist/course/${courseId}/clear/`, {
    data: { reason }
  }).then(r => r.data)

/** POST /api/waitlist/course/:id/notify-all/ — notify all waiting students */
export const notifyAllStudents  = (courseId) =>
  axiosInstance.post(`/waitlist/course/${courseId}/notify-all/`).then(r => r.data)