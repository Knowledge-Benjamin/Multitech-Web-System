import crypto from 'crypto'
import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'
import { backtraceToken, runMeshAnalysis } from '../services/meshProcessor.js'

// Active sessions in memory for SSE streams
const activeSessions = new Map()

export const startSession = asyncHandler(async (req, res) => {
  const { scheduleId } = req.body
  // Accept both lecturer and admin tokens
  const requesterId = req.lecturer?.id || req.admin?.id
  const requesterRole = req.lecturer?.role || req.admin?.role

  if (!scheduleId) {
    return res.status(400).json({ success: false, error: 'scheduleId is required.' })
  }

  // Verify the schedule exists
  const scheduleRes = await pool.query(
    `SELECT cs.id, cs.lecturer_id, cs.lecturer_table_id, c.name as course_name, c.course_code,
            r.name as room_name, cs.day_of_week, cs.start_time, cs.end_time
     FROM class_schedules cs
     JOIN courses c ON cs.course_id = c.id
     JOIN rooms r ON cs.room_id = r.id
     WHERE cs.id = $1`,
    [scheduleId]
  )

  if (scheduleRes.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Class schedule not found.' })
  }

  const schedule = scheduleRes.rows[0]

  // Admins can start any session; lecturers must own the schedule
  const isAdmin = requesterRole === 'admin' || requesterRole === 'superadmin'
  const isOwner = schedule.lecturer_table_id === requesterId
  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      error: 'You are not the assigned lecturer for this class.'
    })
  }

  // Server-side time window enforcement
  const TZ_OFFSET = parseInt(process.env.INSTITUTION_TZ_OFFSET ?? '0')
  const nowUTC = new Date()
  const localNow = new Date(nowUTC.getTime() + TZ_OFFSET * 60 * 60 * 1000)

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const currentDayName = DAY_NAMES[localNow.getUTCDay()]
  const currentTotalMins = localNow.getUTCHours() * 60 + localNow.getUTCMinutes()

  // Parse DB times (HH:MM:SS)
  const [startH, startM] = String(schedule.start_time).split(':').map(Number)
  const [endH, endM] = String(schedule.end_time).split(':').map(Number)
  const scheduleStartMins = startH * 60 + startM
  const scheduleEndMins = endH * 60 + endM

  // Grace windows (minutes)
  const PRE_WINDOW = 15   // 15 min before class
  const POST_WINDOW = 30  // 30 min after class

  if (!isAdmin) {
    if (currentDayName !== schedule.day_of_week) {
      return res.status(403).json({
        success: false,
        error: `This class runs on ${schedule.day_of_week}. Today is ${currentDayName}. Attendance can only be started on the scheduled day.`
      })
    }

    if (currentTotalMins < scheduleStartMins - PRE_WINDOW) {
      const waitMins = (scheduleStartMins - PRE_WINDOW) - currentTotalMins
      const startLabel = `${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}`
      return res.status(403).json({
        success: false,
        error: `Class starts at ${startLabel}. Attendance opens 15 minutes before. Please wait ${waitMins} more minute(s).`
      })
    }

    if (currentTotalMins > scheduleEndMins + POST_WINDOW) {
      const endLabel = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`
      return res.status(403).json({
        success: false,
        error: `This class ended at ${endLabel}. The attendance window has closed (30 minutes after class end).`
      })
    }
  }

  const sessionSecret = crypto.randomBytes(32).toString('hex')

  const result = await pool.query(
    'INSERT INTO class_sessions (schedule_id, session_secret, status, date, start_time) VALUES ($1, $2, $3, CURRENT_DATE, NOW()) RETURNING id',
    [scheduleId, sessionSecret, 'active']
  )
  const sessionId = result.rows[0].id

  // Initialize SSE state in memory
  activeSessions.set(sessionId, {
    secret: sessionSecret,
    startTime: Date.now(),
    clients: [],
    scheduleInfo: {
      courseName: schedule.course_name,
      courseCode: schedule.course_code,
      roomName: schedule.room_name,
      dayOfWeek: schedule.day_of_week
    }
  })

  res.json({
    success: true,
    sessionId,
    scheduleInfo: activeSessions.get(sessionId).scheduleInfo
  })
})

export const streamQrCode = (req, res) => {
  const sessionId = parseInt(req.params.sessionId)
  const session = activeSessions.get(sessionId)

  if (!session) {
    return res.status(404).json({ error: 'Session not active' })
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })

  session.clients.push(res)

  const sendToken = () => {
    const elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000)
    const windowIndex = Math.floor(elapsedSeconds / 5)
    
    const qiToken = crypto
      .createHmac('sha256', session.secret)
      .update(windowIndex.toString())
      .digest('hex')
      .substring(0, 8)

    res.write(`data: ${JSON.stringify({ token: qiToken, windowIndex })}\n\n`)
  }

  sendToken()
  const intervalId = setInterval(sendToken, 5000)

  req.on('close', () => {
    clearInterval(intervalId)
    session.clients = session.clients.filter(c => c !== res)
  })
}

export const submitAttendance = asyncHandler(async (req, res) => {
  let { sessionId, studentId, qrToken, witnessList, latitude, longitude, isMockedLocation } = req.body

  // If student is authenticated via JWT token, resolve authenticated studentId to prevent spoofing
  if (req.student) {
    if (req.student.studentId) {
      studentId = req.student.studentId
    } else if (req.student.id) {
      const stRes = await pool.query('SELECT id FROM students WHERE student_account_id = $1 LIMIT 1', [req.student.id])
      if (stRes.rows.length > 0) {
        studentId = stRes.rows[0].id
      }
    }
  }

  if (!sessionId || !studentId || !qrToken) {
    return res.status(400).json({ success: false, error: 'sessionId, studentId, and qrToken are required.' })
  }

  if (isMockedLocation) {
    return res.status(400).json({ success: false, error: 'Mock location detected. Attendance rejected.' })
  }

  const sessionRes = await pool.query('SELECT session_secret, status FROM class_sessions WHERE id = $1', [sessionId])
  if (sessionRes.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Session not found.' })
  }

  if (sessionRes.rows[0].status === 'ended') {
    return res.status(400).json({ success: false, error: 'Attendance session has already ended.' })
  }

  const secret = sessionRes.rows[0].session_secret
  const windowIndex = backtraceToken(secret, qrToken)

  if (windowIndex === null) {
    return res.status(400).json({ success: false, error: 'Invalid or expired QR token.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Insert raw logs for the mesh analysis if BLE witnesses were provided
    if (Array.isArray(witnessList) && witnessList.length > 0) {
      for (const witness of witnessList) {
        if (witness && witness.ephemeralId) {
          await client.query(
            `INSERT INTO ble_witness_logs (session_id, reporter_student_id, target_ephemeral_id, rssi, window_index) 
             VALUES ($1, $2, $3, $4, $5)`,
            [sessionId, studentId, String(witness.ephemeralId), witness.rssi || -80, windowIndex]
          )
        }
      }
    }

    // Record verified attendance immediately (GPS/QR or BLE pending mesh refinement)
    const verificationType = (Array.isArray(witnessList) && witnessList.length > 0) ? 'BLE_Mesh_Pending' : 'QR_GPS'
    await client.query(
      `INSERT INTO attendance_records (session_id, student_id, verification_type, latitude, longitude, is_mocked_location, status, scan_time, created_at)
       VALUES ($1, $2, $3, $4, $5, false, 'Present', CURRENT_TIMESTAMP, NOW())
       ON CONFLICT (session_id, student_id) DO UPDATE 
       SET latitude = COALESCE(EXCLUDED.latitude, attendance_records.latitude),
           longitude = COALESCE(EXCLUDED.longitude, attendance_records.longitude),
           status = 'Present',
           scan_time = CURRENT_TIMESTAMP`,
      [sessionId, studentId, verificationType, latitude || null, longitude || null]
    )

    await client.query('COMMIT')
    res.json({
      success: true,
      message: 'Attendance successfully verified and recorded as Present.',
      windowIndex,
      verificationType
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})

export const endSessionAndRunMesh = asyncHandler(async (req, res) => {
  const { sessionId } = req.params

  await pool.query("UPDATE class_sessions SET status = 'ended', end_time = NOW(), updated_at = NOW() WHERE id = $1", [sessionId])
  
  // Cleanup SSE
  const session = activeSessions.get(parseInt(sessionId))
  if (session) {
    session.clients.forEach(c => c.end())
    activeSessions.delete(parseInt(sessionId))
  }

  // Run the trilateration algorithm
  const result = await runMeshAnalysis(sessionId)

  res.json({ success: true, verifiedCount: result.verifiedCount || 0, mapData: result.mapData || [] })
})

// === Get Active Sessions for Student / Check-In ===
export const getActiveSessions = async (req, res) => {
  try {
    let studentId = req.student?.studentId || req.query.student_id
    if (!studentId && req.student?.id) {
      const stRes = await pool.query('SELECT id FROM students WHERE student_account_id = $1 LIMIT 1', [req.student.id])
      if (stRes.rows.length > 0) {
        studentId = stRes.rows[0].id
      }
    }
    let query = `
      SELECT 
        cs.id as session_id,
        cs.schedule_id,
        cs.date,
        cs.start_time,
        c.id as course_id,
        c.course_code,
        c.name as course_name,
        r.name as room_name,
        sch.day_of_week,
        COALESCE(l.first_name || ' ' || l.last_name, 'Assigned Lecturer') as lecturer_name
      FROM class_sessions cs
      JOIN class_schedules sch ON cs.schedule_id = sch.id
      JOIN courses c ON sch.course_id = c.id
      JOIN rooms r ON sch.room_id = r.id
      LEFT JOIN lecturers l ON sch.lecturer_table_id = l.id
      WHERE cs.status = 'active'
    `
    const params = []
    if (studentId) {
      query += ` AND c.id IN (
        SELECT cr.course_id 
        FROM course_registrations cr
        JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
        WHERE ste.student_id = $1
      )`
      params.push(studentId)
    }
    query += ' ORDER BY cs.start_time DESC'

    const { rows } = await pool.query(query, params)
    res.json({ success: true, sessions: rows, data: { sessions: rows } })
  } catch (err) {
    console.error('getActiveSessions error:', err)
    res.status(500).json({ success: false, error: 'Server error fetching active sessions' })
  }
}

// === Get Historical Sessions (Admin/Lecturer) ===
export const getHistoricalSessions = async (req, res) => {
  try {
    const query = `
      SELECT 
        cs.id, cs.date, cs.start_time, cs.end_time, cs.session_secret, cs.status,
        c.course_code, c.name as course_name, sch.day_of_week,
        r.name as room_name,
        COUNT(ar.student_id) as present_count
      FROM class_sessions cs
      JOIN class_schedules sch ON cs.schedule_id = sch.id
      JOIN courses c ON sch.course_id = c.id
      JOIN rooms r ON sch.room_id = r.id
      LEFT JOIN attendance_records ar ON cs.id = ar.session_id AND ar.status = 'Present'
      WHERE cs.status = 'ended' OR cs.end_time IS NOT NULL
      GROUP BY cs.id, cs.date, cs.start_time, cs.end_time, cs.session_secret, cs.status, c.course_code, c.name, sch.day_of_week, r.name
      ORDER BY cs.start_time DESC NULLS LAST, cs.id DESC
    `
    const { rows } = await pool.query(query)
    res.json({ success: true, sessions: rows })
  } catch (err) {
    console.error('getHistoricalSessions error:', err)
    res.status(500).json({ success: false, error: 'Server error fetching sessions' })
  }
}

// === Get Session Details & Records ===
export const getSessionRecords = async (req, res) => {
  try {
    const { sessionId } = req.params
    const recordsQuery = `
      SELECT ar.status, ar.verification_type, ar.scan_time, ar.x_coord, ar.y_coord,
             s.student_number, sa.email,
             COALESCE(a.first_name || ' ' || a.last_name, sa.email) as student_name
      FROM attendance_records ar
      JOIN students s ON ar.student_id = s.id
      JOIN student_accounts sa ON s.student_account_id = sa.id
      LEFT JOIN applications a ON s.application_id = a.id
      WHERE ar.session_id = $1
      ORDER BY ar.scan_time ASC
    `
    const { rows } = await pool.query(recordsQuery, [sessionId])
    res.json({ success: true, records: rows })
  } catch (err) {
    console.error('getSessionRecords error:', err)
    res.status(500).json({ success: false, error: 'Server error fetching session records' })
  }
}
