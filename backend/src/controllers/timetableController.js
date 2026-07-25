import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

// ── Rooms ──────────────────────────────────────────────────────────────────────

export const getRooms = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM rooms WHERE status = $1 ORDER BY name ASC', ['active'])
  res.json({ success: true, rooms: result.rows })
})

export const createRoom = asyncHandler(async (req, res) => {
  const { name, capacity, type, building } = req.body
  if (!name || !capacity) {
    return res.status(400).json({ success: false, message: 'Room name and capacity are required.' })
  }
  const result = await pool.query(
    'INSERT INTO rooms (name, capacity, type, building) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, capacity, type || 'Classroom', building || null]
  )
  res.status(201).json({ success: true, room: result.rows[0] })
})

export const deleteRoom = asyncHandler(async (req, res) => {
  const { id } = req.params
  await pool.query("UPDATE rooms SET status = 'inactive' WHERE id = $1", [id])
  res.json({ success: true, message: 'Room deactivated.' })
})

// ── Class Schedules ────────────────────────────────────────────────────────────

export const getSchedules = asyncHandler(async (req, res) => {
  const { lecturerId } = req.query
  let query = `
    SELECT 
      cs.id,
      cs.day_of_week,
      cs.start_time,
      cs.end_time,
      c.id as course_id,
      c.course_code,
      c.name as course_name,
      c.credits,
      r.id as room_id,
      r.name as room_name,
      r.building,
      COALESCE(l.id, au.id) as lecturer_id,
      COALESCE(l.first_name || ' ' || l.last_name, au.username) as lecturer_name,
      COALESCE(l.email, au.email) as lecturer_email,
      t.id as term_id,
      t.name as term_name
    FROM class_schedules cs
    JOIN courses c ON cs.course_id = c.id
    JOIN rooms r ON cs.room_id = r.id
    LEFT JOIN admin_users au ON cs.lecturer_id = au.id
    LEFT JOIN lecturers l ON cs.lecturer_table_id = l.id
    JOIN academic_terms t ON cs.academic_term_id = t.id
  `
  const params = []
  if (lecturerId) {
    query += ' WHERE cs.lecturer_table_id = $1 OR cs.lecturer_id = $1'
    params.push(lecturerId)
  }
  query += ' ORDER BY cs.day_of_week, cs.start_time ASC'

  const result = await pool.query(query, params)
  res.json({ success: true, schedules: result.rows })
})

export const createSchedule = asyncHandler(async (req, res) => {
  const { courseId, roomId, lecturerId, academicTermId, dayOfWeek, startTime, endTime } = req.body

  if (!courseId || !roomId || !lecturerId || !academicTermId || !dayOfWeek || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'All fields are required.' })
  }

  // Prevent double-booking: same room, same day, overlapping time in the same term
  const conflict = await pool.query(`
    SELECT id FROM class_schedules
    WHERE room_id = $1
      AND academic_term_id = $2
      AND day_of_week = $3
      AND (start_time, end_time) OVERLAPS ($4::TIME, $5::TIME)
  `, [roomId, academicTermId, dayOfWeek, startTime, endTime])

  if (conflict.rows.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'Room is already booked at that time. Please choose a different room or time slot.'
    })
  }

  // Prevent lecturer double-booking: same lecturer, same time
  const lecturerConflict = await pool.query(`
    SELECT id FROM class_schedules
    WHERE lecturer_table_id = $1
      AND academic_term_id = $2
      AND day_of_week = $3
      AND (start_time, end_time) OVERLAPS ($4::TIME, $5::TIME)
  `, [lecturerId, academicTermId, dayOfWeek, startTime, endTime])

  if (lecturerConflict.rows.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'Lecturer already has a class at that time slot.'
    })
  }

  const result = await pool.query(
    `INSERT INTO class_schedules 
      (course_id, room_id, lecturer_table_id, academic_term_id, day_of_week, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [courseId, roomId, lecturerId, academicTermId, dayOfWeek, startTime, endTime]
  )

  res.status(201).json({ success: true, scheduleId: result.rows[0].id })
})

export const deleteSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params
  await pool.query('DELETE FROM class_schedules WHERE id = $1', [id])
  res.json({ success: true, message: 'Schedule deleted.' })
})

// ── Supporting Data for Dropdowns ─────────────────────────────────────────────

export const getCoursesList = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT c.id, c.course_code, c.name, p.name as programme_name
    FROM courses c
    LEFT JOIN programmes p ON c.programme_id = p.id
    ORDER BY c.course_code ASC
  `)
  res.json({ success: true, courses: result.rows })
})

export const getLecturersList = asyncHandler(async (req, res) => {
  const result = await pool.query(
    "SELECT id, first_name || ' ' || last_name as username, email FROM lecturers WHERE is_active = true ORDER BY first_name ASC"
  )
  res.json({ success: true, lecturers: result.rows })
})

export const getTermsList = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT id, name FROM academic_terms ORDER BY start_date DESC')
  res.json({ success: true, terms: result.rows })
})
