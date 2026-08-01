import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import axios from 'axios'
import './styles/global.css'
import './styles/mobile.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

axios.interceptors.response.use(
  (response) => response,
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

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error)
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
