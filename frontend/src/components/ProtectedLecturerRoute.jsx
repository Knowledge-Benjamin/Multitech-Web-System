import { Navigate } from 'react-router-dom'

/**
 * Protects lecturer portal routes.
 * Redirects to /portal/login?tab=lecturer if no lecturerToken is found in localStorage.
 */
export default function ProtectedLecturerRoute({ children }) {
  const token = localStorage.getItem('lecturerToken')

  if (!token) {
    return <Navigate to="/lecturer/login" replace />
  }

  return children
}
