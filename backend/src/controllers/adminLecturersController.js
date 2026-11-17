import pool from '../config/database.js'
import bcrypt from 'bcryptjs'

const isExamIntegrationAvailable = async () => {
  const { rows } = await pool.query("SELECT to_regclass('erp_exams') IS NOT NULL AS available")
  return rows[0].available
}

// ── GET all lecturers ────────────────────────────────────────────────────────
export const getLecturers = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        l.id, l.first_name, l.last_name, l.email, l.is_active, l.created_at,
        COUNT(DISTINCT ca.id)::int AS total_assignments,
        COUNT(DISTINCT ca.id) FILTER (
          WHERE at.start_date <= CURRENT_DATE AND at.end_date >= CURRENT_DATE
        )::int AS current_assignments,
        (
          SELECT COUNT(DISTINCT ste.student_id)::int
          FROM course_assignments ca_students
          JOIN course_registrations cr ON cr.course_id = ca_students.course_id AND cr.status = 'registered'
          JOIN student_term_enrollments ste
            ON ste.id = cr.student_term_enrollment_id
            AND ste.academic_term_id = ca_students.academic_term_id
          WHERE ca_students.lecturer_id = l.id
        ) AS total_students,
        (
          SELECT COUNT(*)::int
          FROM course_materials cm
          WHERE cm.lecturer_id = l.id
        ) AS total_materials,
        (
          SELECT COUNT(DISTINCT c.programme_id)::int
          FROM course_assignments ca_programmes
          JOIN courses c ON c.id = ca_programmes.course_id
          WHERE ca_programmes.lecturer_id = l.id
        ) AS total_programmes,
        (
          SELECT COUNT(DISTINCT g.id)::int
          FROM course_assignments ca_grades
          JOIN course_registrations cr ON cr.course_id = ca_grades.course_id
          JOIN student_term_enrollments ste
            ON ste.id = cr.student_term_enrollment_id
            AND ste.academic_term_id = ca_grades.academic_term_id
          JOIN grades g ON g.course_registration_id = cr.id
          WHERE ca_grades.lecturer_id = l.id
        ) AS total_grade_records,
        (
          SELECT COUNT(DISTINCT cs.id)::int
          FROM class_schedules cs
          WHERE cs.lecturer_table_id = l.id OR cs.lecturer_id = l.id
        ) AS total_scheduled_classes
      FROM lecturers l
      LEFT JOIN course_assignments ca ON ca.lecturer_id = l.id
      LEFT JOIN academic_terms at ON at.id = ca.academic_term_id
      GROUP BY l.id
      ORDER BY l.last_name, l.first_name
    `)
    const examIntegrationAvailable = await isExamIntegrationAvailable()
    let examCounts = new Map()
    if (examIntegrationAvailable) {
      const { rows: examRows } = await pool.query(`
        SELECT ca.lecturer_id, COUNT(DISTINCT e.id)::int AS total_exams
        FROM course_assignments ca
        JOIN courses c ON c.id = ca.course_id
        LEFT JOIN erp_exams e ON e.erp_course_code = c.course_code AND e.status <> 'archived'
        GROUP BY ca.lecturer_id
      `)
      examCounts = new Map(examRows.map(row => [row.lecturer_id, row.total_exams]))
    }
    const data = rows.map(lecturer => ({
      ...lecturer,
      total_exams: examIntegrationAvailable ? examCounts.get(lecturer.id) || 0 : null
    }))

    res.json({
      success: true,
      data,
      examIntegrationAvailable,
      summary: {
        totalLecturers: data.length,
        activeLecturers: data.filter(lecturer => lecturer.is_active).length,
        inactiveLecturers: data.filter(lecturer => !lecturer.is_active).length,
        totalAssignments: data.reduce((total, lecturer) => total + Number(lecturer.total_assignments || 0), 0),
        totalMaterials: data.reduce((total, lecturer) => total + Number(lecturer.total_materials || 0), 0)
      }
    })
  } catch (error) {
    console.error('Error fetching lecturers:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch lecturers' })
  }
}

// ── CREATE a lecturer ────────────────────────────────────────────────────────
export const createLecturer = async (req, res) => {
  try {
    const first_name = String(req.body.first_name || '').trim()
    const last_name = String(req.body.last_name || '').trim()
    const email = String(req.body.email || '').trim().toLowerCase()
    const { password } = req.body

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' })
    }

    const existing = await pool.query('SELECT id FROM lecturers WHERE LOWER(email) = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'A lecturer with this email already exists' })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const { rows } = await pool.query(`
      INSERT INTO lecturers (first_name, last_name, email, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, first_name, last_name, email, is_active, created_at
    `, [first_name, last_name, email, password_hash])

    res.status(201).json({ success: true, data: rows[0], message: 'Lecturer created successfully' })
  } catch (error) {
    console.error('Error creating lecturer:', error)
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'A lecturer with this email already exists' })
    }
    res.status(500).json({ success: false, message: 'Failed to create lecturer' })
  }
}

// ── UPDATE a lecturer ────────────────────────────────────────────────────────
export const updateLecturer = async (req, res) => {
  try {
    const { id } = req.params
    const first_name = String(req.body.first_name || '').trim()
    const last_name = String(req.body.last_name || '').trim()
    const email = String(req.body.email || '').trim().toLowerCase()
    const { is_active, password } = req.body

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ success: false, message: 'First name, last name, and email are required.' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' })
    }
    if (is_active !== undefined && typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, message: 'is_active must be a boolean.' })
    }

    let query, params
    if (password) {
      const password_hash = await bcrypt.hash(password, 12)
      query = `UPDATE lecturers SET first_name=$1, last_name=$2, email=$3, is_active=COALESCE($4, is_active), password_hash=$5, updated_at=NOW() WHERE id=$6 RETURNING id, first_name, last_name, email, is_active`
      params = [first_name, last_name, email, is_active ?? null, password_hash, id]
    } else {
      query = `UPDATE lecturers SET first_name=$1, last_name=$2, email=$3, is_active=COALESCE($4, is_active), updated_at=NOW() WHERE id=$5 RETURNING id, first_name, last_name, email, is_active`
      params = [first_name, last_name, email, is_active ?? null, id]
    }

    const { rows } = await pool.query(query, params)
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lecturer not found' })
    }
    res.json({ success: true, data: rows[0], message: 'Lecturer updated' })
  } catch (error) {
    console.error('Error updating lecturer:', error)
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'A lecturer with this email already exists' })
    }
    res.status(500).json({ success: false, message: 'Failed to update lecturer' })
  }
}

// ── GET course assignments for a lecturer ────────────────────────────────────
export const getLecturerAssignments = async (req, res) => {
  try {
    const { id } = req.params
    const { rows } = await pool.query(`
      SELECT 
        ca.id,
        ca.course_id,
        ca.academic_term_id,
        c.course_code,
        c.name AS course_name,
        c.credits,
        c.target_year,
        c.target_semester,
        c.modules,
        p.name AS programme_name,
        at.name AS term_name,
        at.start_date AS term_start_date,
        at.end_date AS term_end_date,
        ay.name AS year_name,
        (
          SELECT COUNT(DISTINCT ste.student_id)::int
          FROM course_registrations cr
          JOIN student_term_enrollments ste
            ON ste.id = cr.student_term_enrollment_id
            AND ste.academic_term_id = ca.academic_term_id
          WHERE cr.course_id = ca.course_id AND cr.status = 'registered'
        ) AS enrolled_students,
        (
          SELECT COUNT(*)::int
          FROM course_materials cm
          WHERE cm.course_id = ca.course_id
            AND cm.academic_term_id = ca.academic_term_id
            AND cm.lecturer_id = ca.lecturer_id
        ) AS materials_count,
        (
          SELECT COUNT(DISTINCT g.id)::int
          FROM course_registrations cr
          JOIN student_term_enrollments ste
            ON ste.id = cr.student_term_enrollment_id
            AND ste.academic_term_id = ca.academic_term_id
          JOIN grades g ON g.course_registration_id = cr.id
          WHERE cr.course_id = ca.course_id AND cr.status = 'registered'
        ) AS grade_records,
        (
          SELECT COUNT(*)::int
          FROM class_schedules cs
          WHERE cs.course_id = ca.course_id
            AND cs.academic_term_id = ca.academic_term_id
            AND (cs.lecturer_table_id = ca.lecturer_id OR cs.lecturer_id = ca.lecturer_id)
        ) AS scheduled_classes
      FROM course_assignments ca
      JOIN courses c ON ca.course_id = c.id
      JOIN programmes p ON c.programme_id = p.id
      JOIN academic_terms at ON ca.academic_term_id = at.id
      JOIN academic_years ay ON at.academic_year_id = ay.id
      WHERE ca.lecturer_id = $1
      ORDER BY at.start_date DESC, c.course_code
    `, [id])
    const examIntegrationAvailable = await isExamIntegrationAvailable()
    let examCounts = new Map()
    if (examIntegrationAvailable) {
      const { rows: examRows } = await pool.query(`
        SELECT ca.id AS assignment_id, COUNT(DISTINCT e.id)::int AS exams_count
        FROM course_assignments ca
        JOIN courses c ON c.id = ca.course_id
        LEFT JOIN erp_exams e ON e.erp_course_code = c.course_code AND e.status <> 'archived'
        WHERE ca.lecturer_id = $1
        GROUP BY ca.id
      `, [id])
      examCounts = new Map(examRows.map(row => [row.assignment_id, row.exams_count]))
    }
    const data = rows.map(assignment => ({
      ...assignment,
      exams_count: examIntegrationAvailable ? examCounts.get(assignment.id) || 0 : null
    }))
    res.json({ success: true, data, examIntegrationAvailable })
  } catch (error) {
    console.error('Error fetching assignments:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch assignments' })
  }
}

// ── ASSIGN a course to a lecturer ────────────────────────────────────────────
export const assignCourse = async (req, res) => {
  try {
    const { lecturer_id, course_id, academic_term_id } = req.body

    const { rows } = await pool.query(`
      INSERT INTO course_assignments (lecturer_id, course_id, academic_term_id)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
      RETURNING *
    `, [lecturer_id, course_id, academic_term_id])

    if (rows.length === 0) {
      return res.status(409).json({ success: false, message: 'This assignment already exists' })
    }

    res.status(201).json({ success: true, data: rows[0], message: 'Course assigned successfully' })
  } catch (error) {
    console.error('Error assigning course:', error)
    res.status(500).json({ success: false, message: 'Failed to assign course' })
  }
}

// ── REMOVE a course assignment ────────────────────────────────────────────────
export const removeAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params
    await pool.query('DELETE FROM course_assignments WHERE id = $1', [assignmentId])
    res.json({ success: true, message: 'Assignment removed' })
  } catch (error) {
    console.error('Error removing assignment:', error)
    res.status(500).json({ success: false, message: 'Failed to remove assignment' })
  }
}
