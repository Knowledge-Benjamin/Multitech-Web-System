import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import axios from 'axios'
import './styles/global.css'
import './styles/mobile.css'

const CACHE_TTL_MS = 15 * 1000
const STALE_WHILE_REVALIDATE_MS = 60 * 1000
const responseCache = new Map()
const refreshAxios = axios.create()
const cacheablePrefixes = [
  '/api/programmes',
  '/api/programme-categories',
  '/api/announcements',
  '/api/articles',
  '/api/about',
  '/api/home/reasons',
  '/api/calendar',
  '/api/functional-fees',
  '/api/programme-fees',
  '/api/images'
]

const isCacheableGet = (config) => {
  if (!config?.url) return false
  const method = config.method?.toLowerCase() || 'get'
  if (method !== 'get') return false

  const url = new URL(config.url, window.location.origin)
  return cacheablePrefixes.some((prefix) => url.pathname.startsWith(prefix))
}

axios.interceptors.response.use(
  (response) => {
    if (isCacheableGet(response.config)) {
      responseCache.set(`${response.config.method?.toUpperCase() || 'GET'}:${response.config.url}`, {
        timestamp: Date.now(),
        response
      })
    }
    return response
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const path = window.location.pathname
      if (path.startsWith('/admin')) {
        localStorage.removeItem('adminToken')
        window.location.href = '/admin/login'
      } else if (path.startsWith('/student')) {
        localStorage.removeItem('studentToken')
        window.location.href = '/student/login'
      } else if (path.startsWith('/lecturer')) {
        localStorage.removeItem('lecturerToken')
        localStorage.removeItem('lecturerInfo')
        window.location.href = '/lecturer/login'
      }
    }
    return Promise.reject(error)
  }
)

const getCacheKey = (config) => `${config.method?.toUpperCase() || 'GET'}:${config.url}`

const refreshCachedRequest = (config, cacheKey) => {
  if (config.__backgroundRefresh) return

  refreshAxios.request({
    method: config.method || 'get',
    url: config.url,
    headers: config.headers,
    params: config.params
  }).then((response) => {
    responseCache.set(cacheKey, {
      timestamp: Date.now(),
      response
    })
  }).catch(() => undefined)
}

const applyLazyLoading = () => {
  const images = document.querySelectorAll('img')
  images.forEach((img) => {
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy')
    }
    if (!img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async')
    }
    if (!img.hasAttribute('fetchpriority')) {
      img.setAttribute('fetchpriority', 'low')
    }
  })
}

if (typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver(() => applyLazyLoading())
  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  })
}

applyLazyLoading()

axios.interceptors.request.use((config) => {
  if (isCacheableGet(config)) {
    const cacheKey = getCacheKey(config)
    const cachedEntry = responseCache.get(cacheKey)

    if (cachedEntry) {
      const age = Date.now() - cachedEntry.timestamp
      if (age < CACHE_TTL_MS) {
        return Promise.reject({
          __cachedResponse: cachedEntry.response,
          config,
          cacheKey
        })
      }

      if (age < STALE_WHILE_REVALIDATE_MS) {
        refreshCachedRequest(config, cacheKey)
        return Promise.reject({
          __cachedResponse: cachedEntry.response,
          config,
          cacheKey,
          stale: true
        })
      }
    }
  }
  return config
})

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.__cachedResponse) {
      return Promise.resolve(error.__cachedResponse)
    }
    return Promise.reject(error)
  }
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error)
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
