import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import axios from 'axios'
import './styles/global.css'

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
