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

  // ── Server-side time enforcement ─────────────────────────────────────────────
  // We use the SERVER clock + configured UTC offset — the client cannot spoof this.
  const TZ_OFFSET = parseInt(process.env.INSTITUTION_TZ_OFFSET ?? '0')
  const nowUTC = new Date()
  // Shift UTC time to institution's local time
  const localNow = new Date(nowUTC.getTime() + TZ_OFFSET * 60 * 60 * 1000)

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const currentDayName = DAY_NAMES[localNow.getUTCDay()]
  const currentTotalMins = localNow.getUTCHours() * 60 + localNow.getUTCMinutes()

  // Parse DB times (stored as HH:MM:SS)
  const [startH, startM] = String(schedule.start_time).split(':').map(Number)
  const [endH, endM] = String(schedule.end_time).split(':').map(Number)
  const scheduleStartMins = startH * 60 + startM
  const scheduleEndMins = endH * 60 + endM

  // Grace windows (minutes)
  const PRE_WINDOW = 15   // allow opening 15 min before class starts
  const POST_WINDOW = 30  // allow opening up to 30 min after class ends

  if (!isAdmin) {
    // Day check
    if (currentDayName !== schedule.day_of_week) {
      return res.status(403).json({
        success: false,
        error: `This class runs on ${schedule.day_of_week}. Today is ${currentDayName}. Attendance can only be started on the scheduled day.`
      })
    }

    // Too early
    if (currentTotalMins < scheduleStartMins - PRE_WINDOW) {
      const waitMins = (scheduleStartMins - PRE_WINDOW) - currentTotalMins
      const startLabel = `${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}`
      return res.status(403).json({
        success: false,
        error: `Class starts at ${startLabel}. Attendance opens 15 minutes before. Please wait ${waitMins} more minute(s).`
      })
    }

    // Too late
    if (currentTotalMins > scheduleEndMins + POST_WINDOW) {
      const endLabel = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`
      return res.status(403).json({
        success: false,
        error: `This class ended at ${endLabel}. The attendance window has closed (30 minutes after class end).`
      })
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────


  const sessionSecret = crypto.randomBytes(32).toString('hex')

  const result = await pool.query(
    'INSERT INTO class_sessions (schedule_id, session_secret, status) VALUES ($1, $2, $3) RETURNING id',
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

  // Setup Server-Sent Events (SSE) headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })

  session.clients.push(res)

  // Send a new token every 5 seconds
  const intervalId = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000)
    const windowIndex = Math.floor(elapsedSeconds / 5)
    
    const qiToken = crypto
      .createHmac('sha256', session.secret)
      .update(windowIndex.toString())
      .digest('hex')
      .substring(0, 8)

    res.write(`data: ${JSON.stringify({ token: qiToken, windowIndex })}\n\n`)
  }, 5000)

  req.on('close', () => {
    clearInterval(intervalId)
    session.clients = session.clients.filter(c => c !== res)
  })
}

export const submitAttendance = asyncHandler(async (req, res) => {
  const { sessionId, studentId, qrToken, witnessList, latitude, longitude, isMockedLocation } = req.body

  if (isMockedLocation) {
    return res.status(400).json({ error: 'Mock location detected. Attendance rejected.' })
  }

  const sessionRes = await pool.query('SELECT session_secret FROM class_sessions WHERE id = $1', [sessionId])
  if (sessionRes.rows.length === 0) {
    return res.status(404).json({ error: 'Session not found.' })
  }

  const secret = sessionRes.rows[0].session_secret
  const windowIndex = backtraceToken(secret, qrToken)

  if (windowIndex === null) {
    return res.status(400).json({ error: 'Invalid or expired QR token.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Insert raw logs for the mesh analysis
    for (const witness of witnessList) {
      await client.query(
        `INSERT INTO ble_witness_logs (session_id, reporter_student_id, target_ephemeral_id, rssi, window_index) 
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, studentId, witness.ephemeralId, witness.rssi, windowIndex]
      )
    }

    // In a real system, attendance is only marked after runMeshAnalysis() finishes.
    // For now, we also insert a GPS fallback record if they have no witnesses but valid GPS.
    // We will let the meshProcessor finalize the actual 'Present' status based on peer signals.
    
    await client.query('COMMIT')
    res.json({ success: true, message: 'Payload received and queued for mesh analysis.' })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})

export const endSessionAndRunMesh = asyncHandler(async (req, res) => {
  const { sessionId } = req.params

  await pool.query("UPDATE class_sessions SET status = 'ended' WHERE id = $1", [sessionId])
  
  // Cleanup SSE
  const session = activeSessions.get(parseInt(sessionId))
  if (session) {
    session.clients.forEach(c => c.end())
    activeSessions.delete(parseInt(sessionId))
  }

  // Run the trilateration algorithm
  const result = await runMeshAnalysis(sessionId)

  res.json({ success: true, verifiedCount: result.verifiedCount, mapData: result.mapData })
})

// === NEW: Get Historical Sessions (Admin/Lecturer) ===
export const getHistoricalSessions = async (req, res) => {
  try {
    const query = `
      SELECT 
        cs.id, cs.start_time, cs.end_time, cs.session_secret,
        sch.course_code, sch.course_name, sch.day_of_week,
        r.name as room_name,
        COUNT(ar.student_id) as present_count
      FROM class_sessions cs
      JOIN class_schedules sch ON cs.schedule_id = sch.id
      JOIN rooms r ON sch.room_id = r.id
      LEFT JOIN attendance_records ar ON cs.id = ar.session_id AND ar.status = 'Present'
      WHERE cs.end_time IS NOT NULL
      GROUP BY cs.id, sch.course_code, sch.course_name, sch.day_of_week, r.name
      ORDER BY cs.end_time DESC
    `
    const { rows } = await pool.query(query)
    res.json({ sessions: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error fetching sessions' })
  }
}

// === NEW: Get Session Details & Records ===
export const getSessionRecords = async (req, res) => {
  try {
    const { sessionId } = req.params
    const recordsQuery = `
      SELECT ar.status, ar.verification_type, ar.scan_time, ar.x_coord, ar.y_coord,
             u.username, u.email
      FROM attendance_records ar
      JOIN users u ON ar.student_id = u.id
      WHERE ar.session_id = $1
    `
    const { rows } = await pool.query(recordsQuery, [sessionId])
    res.json({ records: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error fetching session records' })
  }
}
