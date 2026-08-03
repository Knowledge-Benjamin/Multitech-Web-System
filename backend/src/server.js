import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import dns from 'dns'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Force IPv4-only DNS globally to avoid ENETUNREACH on IPv6 addresses
dns.setDefaultResultOrder('ipv4first')

import errorHandler from './middleware/errorHandler.js'
import requestLogger from './middleware/requestLogger.js'
import initAdmin from './config/initAdmin.js'
import initializeDatabase from './config/migrate.js'

import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import programmeRoutes from './routes/programmes.js'
import programmeCategoriesRoutes from './routes/programmeCategories.js'
import applicationRoutes from './routes/applications.js'
import announcementRoutes from './routes/announcements.js'
import articleRoutes from './routes/articles.js'
import imageRoutes from './routes/images.js'
import functionalFeesRoutes from './routes/functionalFees.js'
import programmeFeesRoutes from './routes/programmeFees.js'
import aboutRoutes from './routes/about.js'
import homeReasonsRoutes from './routes/homeReasons.js'
import studentAuthRoutes from './routes/studentAuth.js'
import calendarRoutes from './routes/calendar.js'
import studentsRoutes from './routes/students.js'
import studentProfileRoutes from './routes/studentProfile.js'
import emailRoutes from './routes/emails.js'
import examPortalWebhookRoutes from './routes/examPortalWebhook.js'
import attendanceRoutes from './routes/attendance.js'
import timetableRoutes from './routes/timetable.js'
import lecturerRoutes from './routes/lecturer.js'
import adminLecturersRoutes from './routes/adminLecturers.js'
import courseUnitsRoutes from './routes/courseUnits.js'
import intakesRoutes from './routes/intakes.js'
import campusesRoutes from './routes/campuses.js'
import adminCampusesRoutes from './routes/adminCampuses.js'
import facultiesRoutes from './routes/faculties.js'
import departmentsRoutes from './routes/departments.js'
dotenv.config()

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not defined.')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('FATAL ERROR: DATABASE_URL environment variable is not defined.')
  process.exit(1)
}
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Disable ETag to prevent 304 Not Modified responses
app.disable('etag')

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}))

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://multitech-web-system.onrender.com',
  'https://www.multitech-web-system.onrender.com'
]

const corsOrigin = process.env.CORS_ORIGIN || ''
if (corsOrigin) {
  // Support comma-separated list of origins
  const additionalOrigins = corsOrigin.split(',').map(o => o.trim()).filter(Boolean)
  allowedOrigins.push(...additionalOrigins)
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }
    // Remove trailing slash if present for strict equality matching
    const cleanOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin
    if (allowedOrigins.includes(cleanOrigin)) {
      callback(null, true)
      return
    }
    callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma']
}))

// Body parsing middleware — capture rawBody for HMAC signature verification
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf.toString() }
}))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// Request logging
app.use(requestLogger)

app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
  }

  next()
})

const initializeApp = async () => {
  await initializeDatabase()
  await initAdmin()

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() })
  })

  // API Routes
  app.use('/api/auth', authRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/admin/campuses', adminCampusesRoutes)
  app.use('/api/programmes', programmeRoutes)
  app.use('/api/programme-categories', programmeCategoriesRoutes)
  app.use('/api/applications', applicationRoutes)
  app.use('/api/announcements', announcementRoutes)
  app.use('/api/articles', articleRoutes)
  app.use('/api/about', aboutRoutes)
  app.use('/api/home/reasons', homeReasonsRoutes)
  app.use('/api/images', imageRoutes)
  app.use('/api/functional-fees', functionalFeesRoutes)
  app.use('/api/programme-fees', programmeFeesRoutes)
  app.use('/api/student-auth', studentAuthRoutes)
  app.use('/api/calendar', calendarRoutes)
  app.use('/api/students', studentsRoutes)
  app.use('/api/student-profile', studentProfileRoutes)
  app.use('/api/emails', emailRoutes)
  app.use('/api/exam-portal/webhook', examPortalWebhookRoutes)
  app.use('/api/attendance', attendanceRoutes)
  app.use('/api/timetable', timetableRoutes)
  app.use('/api/lecturer', lecturerRoutes)
  app.use('/api/admin/lecturers', adminLecturersRoutes)
  app.use('/api/course-units', courseUnitsRoutes)
  app.use('/api/intakes', intakesRoutes)
  app.use('/api/campuses', campusesRoutes)
  app.use('/api/faculties', facultiesRoutes)
  app.use('/api/departments', departmentsRoutes)

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.originalUrl
    })
  })

  // Error handling middleware
  app.use(errorHandler)

  // Start server
  app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════════╗
    ║   Multitech Business School API Server     ║
    ║   Running on: http://localhost:${PORT}      ║
    ║   Environment: ${process.env.NODE_ENV || 'development'}              ║
    ║   CORS Origin: ${process.env.CORS_ORIGIN}   ║
    ╚════════════════════════════════════════════╝
    `)
  })
}

initializeApp().catch((error) => {
  console.error('Failed to initialize app:', error)
  process.exit(1)
})

export default app
