import { Navigate } from 'react-router-dom'

/**
 * Protects student portal routes.
 * Redirects to /student/login if no studentToken is found in localStorage.
 */
export default function ProtectedStudentRoute({ children }) {
  const token = localStorage.getItem('studentToken')

  if (!token) {
    return <Navigate to="/student/login" replace />
  }

  return children
}
