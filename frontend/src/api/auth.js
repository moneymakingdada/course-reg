import axiosInstance from './axiosInstance'

/**
 * POST /api/auth/login/
 * Returns { access, refresh, user }
 */
export const login = async (email, password) => {
  const { data } = await axiosInstance.post('/auth/login/', { email, password })
  // Persist tokens
  localStorage.setItem('access',  data.access)
  localStorage.setItem('refresh', data.refresh)
  localStorage.setItem('user',    JSON.stringify(data.user))
  return data
}

/**
 * POST /api/auth/register/
 * Accepts all registration fields; returns { access, refresh, user }
 */
export const register = async (payload) => {
  const { data } = await axiosInstance.post('/auth/register/', payload)
  localStorage.setItem('access',  data.access)
  localStorage.setItem('refresh', data.refresh)
  localStorage.setItem('user',    JSON.stringify(data.user))
  return data
}

/**
 * POST /api/auth/logout/
 * Blacklists the refresh token and clears localStorage.
 */
export const logout = async () => {
  const refresh = localStorage.getItem('refresh')
  try {
    await axiosInstance.post('/auth/logout/', { refresh })
  } finally {
    localStorage.clear()
  }
}

/**
 * GET /api/auth/profile/
 * Returns full profile of the currently authenticated user.
 */
export const getProfile = async () => {
  const { data } = await axiosInstance.get('/auth/profile/')
  return data
}

/**
 * PATCH /api/auth/profile/
 */
export const updateProfile = async (payload) => {
  const { data } = await axiosInstance.patch('/auth/profile/', payload)
  return data
}

/**
 * POST /api/auth/change-password/
 */
export const changePassword = async (payload) => {
  const { data } = await axiosInstance.post('/auth/change-password/', payload)
  return data
}

/**
 * GET /api/auth/users/           — admin: list all users
 * GET /api/auth/users/?role=     — filter by role
 */
export const getUsers = async (params = {}) => {
  const { data } = await axiosInstance.get('/auth/users/', { params })
  return data
}

/**
 * GET    /api/auth/users/:id/
 * PATCH  /api/auth/users/:id/
 * DELETE /api/auth/users/:id/
 */
export const getUserById   = async (id)           => (await axiosInstance.get(`/auth/users/${id}/`)).data
export const updateUser    = async (id, payload)  => (await axiosInstance.patch(`/auth/users/${id}/`, payload)).data
export const deleteUser    = async (id)           => (await axiosInstance.delete(`/auth/users/${id}/`)).data