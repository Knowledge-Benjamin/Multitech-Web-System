import axios from 'axios'

const normalizeApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL || '/api'
  if (!configured) return '/api'
  return configured.replace(/\/$/, '')
}

const API_BASE_URL = normalizeApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

const applyNoCacheHeaders = (config) => {
  if (config?.method?.toLowerCase() === 'get') {
    config.headers = {
      ...(config.headers || {}),
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache'
    }
  }
  return config
}

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('studentToken') || localStorage.getItem('lecturerToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return applyNoCacheHeaders(config)
  },
  (error) => Promise.reject(error)
)

// Handle responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      // Only clear the tokens that belong to the portal that returned 401
      if (url.includes('/student-auth') || url.includes('/student-profile') || url.includes('/students/')) {
        localStorage.removeItem('studentToken')
        localStorage.removeItem('studentUser')
      } else if (url.includes('/lecturer') || url.includes('/lecturer-auth')) {
        localStorage.removeItem('lecturerToken')
        localStorage.removeItem('lecturerUser')
        localStorage.removeItem('lecturerInfo')
      } else {
        // Default: clear admin tokens (most admin routes return 401 when session expires)
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
      }
    }
    return Promise.reject(error)
  }
)

export default api
