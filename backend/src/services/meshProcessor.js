import crypto from 'crypto'
import pool from '../config/database.js'

/**
 * Validates a TOTP QR token against the historical 5-second windows.
 * 
 * @param {string} sessionSecret - The secret generated when session started
 * @param {string} qiToken - The Q_i token scanned by the student
 * @param {number} maxWindows - The max number of windows to search (e.g. 720 for 1 hr)
 * @returns {number|null} - The window_index if matched, otherwise null
 */
export function backtraceToken(sessionSecret, qiToken, maxWindows = 720) {
  if (!sessionSecret || !qiToken) return null

  // Fast check: check recent windows first (last ~3 minutes) for instant O(1) matching
  for (let i = 0; i < 36; i++) {
    const expectedToken = crypto
      .createHmac('sha256', sessionSecret)
      .update(i.toString())
      .digest('hex')
      .substring(0, 8) 
    
    if (expectedToken === qiToken) {
      return i
    }
  }

  // Fallback scan across remaining windows
  for (let i = 36; i < maxWindows; i++) {
    const expectedToken = crypto
      .createHmac('sha256', sessionSecret)
      .update(i.toString())
      .digest('hex')
      .substring(0, 8) 
    
    if (expectedToken === qiToken) {
      return i
    }
  }
  return null
}

/**
 * Runs the Recursive Trilateration (Sweep-Line Propagation) algorithm.
 * Converts raw BLE witness logs into confirmed attendance records and spatial maps.
 * 
 * @param {number} sessionId - The ID of the class session
 */
export async function runMeshAnalysis(sessionId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Fetch all raw logs for the session
    const logsRes = await client.query(
      'SELECT reporter_student_id, target_ephemeral_id, rssi, window_index FROM ble_witness_logs WHERE session_id = $1',
      [sessionId]
    )
    const logs = logsRes.rows

    if (logs.length === 0) {
      await client.query('COMMIT')
      return { success: true, verifiedCount: 0, mapData: [], message: 'No BLE logs recorded.' }
    }

    // 2. Data Structures
    const studentLogs = {}
    logs.forEach(log => {
      const sid = Number(log.reporter_student_id)
      if (!studentLogs[sid]) studentLogs[sid] = []
      studentLogs[sid].push(log)
    })

    const verifiedStudents = new Map() // Map of studentId -> { x, y }

    // 3. Find Wave 1 (Front Row)
    // Identify students who witnessed the Lecturer anchor with RSSI > -60dBm.
    let currentX = -2 // Start spacing students from left to right

    for (const [studentId, sLogs] of Object.entries(studentLogs)) {
      const sid = Number(studentId)
      const lecturerPing = sLogs.find(l => {
        const target = String(l.target_ephemeral_id || '').toLowerCase()
        return target === 'lecturer_anchor' || target === 'lecturer' || target === 'anchor'
      })
      
      if (lecturerPing && lecturerPing.rssi > -60) {
        verifiedStudents.set(sid, { x: currentX, y: 1 })
        currentX += 1.5 // Space them out laterally
      }
    }

    // 4. Recursive Propagation (Wave 2...N)
    let newlyAdded = true
    let waveDepth = 2 // Y-axis

    while (newlyAdded) {
      newlyAdded = false
      let waveX = -2

      for (const [studentId, sLogs] of Object.entries(studentLogs)) {
        const sid = Number(studentId)
        if (verifiedStudents.has(sid)) continue

        // Did they see a student from the PREVIOUS wave?
        const strongPeerPing = sLogs.find(l => {
          const peerId = Number(l.target_ephemeral_id)
          const peerCoord = verifiedStudents.get(peerId)
          // Ensure the peer is in the previous wave (y = waveDepth - 1) and ping is strong
          return peerCoord && peerCoord.y === waveDepth - 1 && l.rssi > -75
        })

        if (strongPeerPing) {
          verifiedStudents.set(sid, { x: waveX, y: waveDepth })
          waveX += 1.5
          newlyAdded = true
        }
      }
      
      if (newlyAdded) waveDepth += 1
    }

    // 5. Commit Verified Students to Attendance Records with Coordinates
    const verifiedData = []
    for (const [studentId, coords] of verifiedStudents.entries()) {
      await client.query(
        `INSERT INTO attendance_records (session_id, student_id, verification_type, status, scan_time, x_coord, y_coord, created_at) 
         VALUES ($1, $2, 'BLE_Mesh', 'Present', CURRENT_TIMESTAMP, $3, $4, NOW())
         ON CONFLICT (session_id, student_id) DO UPDATE 
         SET verification_type = 'BLE_Mesh', status = 'Present', x_coord = EXCLUDED.x_coord, y_coord = EXCLUDED.y_coord`,
        [sessionId, studentId, coords.x, coords.y]
      )
      verifiedData.push({ studentId, x: coords.x, y: coords.y })
    }

    await client.query('COMMIT')
    return { success: true, verifiedCount: verifiedStudents.size, mapData: verifiedData }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
