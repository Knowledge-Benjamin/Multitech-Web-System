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

// ── Update Schedule (Complete Flexibility) ───────────────────────────────────

export const updateSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { courseId, roomId, lecturerId, academicTermId, dayOfWeek, startTime, endTime, allowConflictOverride } = req.body

  if (!courseId || !roomId || !lecturerId || !academicTermId || !dayOfWeek || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'All fields are required.' })
  }

  if (!allowConflictOverride) {
    // Check room conflict excluding current schedule
    const roomConflict = await pool.query(`
      SELECT id FROM class_schedules
      WHERE room_id = $1
        AND academic_term_id = $2
        AND day_of_week = $3
        AND id != $4
        AND (start_time, end_time) OVERLAPS ($5::TIME, $6::TIME)
    `, [roomId, academicTermId, dayOfWeek, id, startTime, endTime])

    if (roomConflict.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Room is already booked at that time slot. Please choose another room or time.'
      })
    }

    // Check lecturer conflict excluding current schedule
    const lecturerConflict = await pool.query(`
      SELECT id FROM class_schedules
      WHERE lecturer_table_id = $1
        AND academic_term_id = $2
        AND day_of_week = $3
        AND id != $4
        AND (start_time, end_time) OVERLAPS ($5::TIME, $6::TIME)
    `, [lecturerId, academicTermId, dayOfWeek, id, startTime, endTime])

    if (lecturerConflict.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Lecturer already has a class scheduled at that time slot.'
      })
    }
  }

  const result = await pool.query(`
    UPDATE class_schedules
    SET course_id = $1,
        room_id = $2,
        lecturer_table_id = $3,
        academic_term_id = $4,
        day_of_week = $5,
        start_time = $6,
        end_time = $7
    WHERE id = $8
    RETURNING *
  `, [courseId, roomId, lecturerId, academicTermId, dayOfWeek, startTime, endTime, id])

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Class schedule not found.' })
  }

  res.json({ success: true, schedule: result.rows[0], message: 'Schedule updated successfully.' })
})

// ── Update Room Details ───────────────────────────────────────────────────────

export const updateRoom = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { name, capacity, type, building, status } = req.body
  const result = await pool.query(
    'UPDATE rooms SET name = COALESCE($1, name), capacity = COALESCE($2, capacity), type = COALESCE($3, type), building = COALESCE($4, building), status = COALESCE($5, status) WHERE id = $6 RETURNING *',
    [name, capacity, type, building, status || 'active', id]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Room not found.' })
  }
  res.json({ success: true, room: result.rows[0], message: 'Room updated.' })
})

// ── Auto-Generate Timetable (Constraint Satisfaction Engine) ──────────────────

export const autoGenerateTimetable = asyncHandler(async (req, res) => {
  const { academicTermId, preferredDays, slotDurationHours, startHour, endHour, clearExisting } = req.body

  if (!academicTermId) {
    return res.status(400).json({ success: false, message: 'academicTermId is required.' })
  }

  const days = Array.isArray(preferredDays) && preferredDays.length > 0 
    ? preferredDays 
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  const duration = slotDurationHours ? Number(slotDurationHours) : 2
  const sHour = startHour ? Number(startHour) : 8
  const eHour = endHour ? Number(endHour) : 17

  const timeSlots = []
  for (let h = sHour; h + duration <= eHour; h += duration) {
    const startStr = `${String(h).padStart(2, '0')}:00:00`
    const endStr = `${String(h + duration).padStart(2, '0')}:00:00`
    timeSlots.push({ start: startStr, end: endStr })
  }

  if (timeSlots.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid start or end hour window.' })
  }

  const roomsRes = await pool.query("SELECT id, name, capacity FROM rooms WHERE status = 'active' ORDER BY capacity DESC")
  const lecturersRes = await pool.query("SELECT id, first_name, last_name FROM lecturers WHERE is_active = true ORDER BY id ASC")
  const coursesRes = await pool.query("SELECT id, course_code, name FROM courses ORDER BY course_code ASC")

  if (roomsRes.rows.length === 0) {
    return res.status(400).json({ success: false, message: 'No active rooms available. Please add rooms first.' })
  }
  if (lecturersRes.rows.length === 0) {
    return res.status(400).json({ success: false, message: 'No active lecturers available. Please add lecturers first.' })
  }
  if (coursesRes.rows.length === 0) {
    return res.status(400).json({ success: false, message: 'No courses found to schedule.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    if (clearExisting) {
      await client.query('DELETE FROM class_schedules WHERE academic_term_id = $1', [academicTermId])
    }

    const existingRes = await client.query(`
      SELECT room_id, lecturer_table_id, day_of_week, start_time, end_time
      FROM class_schedules
      WHERE academic_term_id = $1
    `, [academicTermId])

    const isRoomBusy = (roomId, day, sTime, eTime) => {
      return existingRes.rows.some(row => 
        row.room_id === roomId &&
        row.day_of_week === day &&
        !(eTime <= row.start_time || sTime >= row.end_time)
      )
    }

    const isLecturerBusy = (lecturerId, day, sTime, eTime) => {
      return existingRes.rows.some(row => 
        row.lecturer_table_id === lecturerId &&
        row.day_of_week === day &&
        !(eTime <= row.start_time || sTime >= row.end_time)
      )
    }

    const scheduled = []
    const unallocated = []

    let lecturerIdx = 0
    let dayIdx = 0
    let slotIdx = 0

    for (const course of coursesRes.rows) {
      let allocated = false

      searchLoop:
      for (let d = 0; d < days.length; d++) {
        const curDay = days[(dayIdx + d) % days.length]

        for (let s = 0; s < timeSlots.length; s++) {
          const curSlot = timeSlots[(slotIdx + s) % timeSlots.length]

          for (let l = 0; l < lecturersRes.rows.length; l++) {
            const curLecturer = lecturersRes.rows[(lecturerIdx + l) % lecturersRes.rows.length]

            if (isLecturerBusy(curLecturer.id, curDay, curSlot.start, curSlot.end)) {
              continue
            }

            for (const curRoom of roomsRes.rows) {
              if (isRoomBusy(curRoom.id, curDay, curSlot.start, curSlot.end)) {
                continue
              }

              const ins = await client.query(`
                INSERT INTO class_schedules (course_id, room_id, lecturer_table_id, academic_term_id, day_of_week, start_time, end_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
              `, [course.id, curRoom.id, curLecturer.id, academicTermId, curDay, curSlot.start, curSlot.end])

              existingRes.rows.push({
                room_id: curRoom.id,
                lecturer_table_id: curLecturer.id,
                day_of_week: curDay,
                start_time: curSlot.start,
                end_time: curSlot.end
              })

              scheduled.push({
                id: ins.rows[0].id,
                courseCode: course.course_code,
                courseName: course.name,
                roomName: curRoom.name,
                lecturerName: `${curLecturer.first_name} ${curLecturer.last_name}`,
                day: curDay,
                time: `${curSlot.start.substring(0, 5)} - ${curSlot.end.substring(0, 5)}`
              })

              allocated = true
              dayIdx++
              slotIdx++
              lecturerIdx++
              break searchLoop
            }
          }
        }
      }

      if (!allocated) {
        unallocated.push(course.course_code)
      }
    }

    await client.query('COMMIT')

    res.json({
      success: true,
      message: `Successfully generated ${scheduled.length} class schedules automatically without conflicts.`,
      scheduledCount: scheduled.length,
      unallocatedCount: unallocated.length,
      unallocatedCourses: unallocated,
      schedules: scheduled
    })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// ── Clear Term Schedules ──────────────────────────────────────────────────────

export const clearTermSchedules = asyncHandler(async (req, res) => {
  const { termId } = req.params
  const result = await pool.query('DELETE FROM class_schedules WHERE academic_term_id = $1 RETURNING id', [termId])
  res.json({ success: true, deletedCount: result.rows.length, message: `Cleared ${result.rows.length} schedule slots for this term.` })
})
