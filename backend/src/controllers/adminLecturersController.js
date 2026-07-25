import pool from '../config/database.js'
import bcrypt from 'bcryptjs'

// ── GET all lecturers ────────────────────────────────────────────────────────
export const getLecturers = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        l.id, l.first_name, l.last_name, l.email, l.is_active, l.created_at,
        COUNT(DISTINCT ca.id) as total_assignments
      FROM lecturers l
      LEFT JOIN course_assignments ca ON ca.lecturer_id = l.id
      GROUP BY l.id
      ORDER BY l.last_name, l.first_name
    `)
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('Error fetching lecturers:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch lecturers' })
  }
}

// ── CREATE a lecturer ────────────────────────────────────────────────────────
export const createLecturer = async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    const existing = await pool.query('SELECT id FROM lecturers WHERE email = $1', [email])
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
    res.status(500).json({ success: false, message: 'Failed to create lecturer' })
  }
}

// ── UPDATE a lecturer ────────────────────────────────────────────────────────
export const updateLecturer = async (req, res) => {
  try {
    const { id } = req.params
    const { first_name, last_name, email, is_active, password } = req.body

    let query, params
    if (password) {
      const password_hash = await bcrypt.hash(password, 12)
      query = `UPDATE lecturers SET first_name=$1, last_name=$2, email=$3, is_active=$4, password_hash=$5, updated_at=NOW() WHERE id=$6 RETURNING id, first_name, last_name, email, is_active`
      params = [first_name, last_name, email, is_active, password_hash, id]
    } else {
      query = `UPDATE lecturers SET first_name=$1, last_name=$2, email=$3, is_active=$4, updated_at=NOW() WHERE id=$5 RETURNING id, first_name, last_name, email, is_active`
      params = [first_name, last_name, email, is_active, id]
    }

    const { rows } = await pool.query(query, params)
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lecturer not found' })
    }
    res.json({ success: true, data: rows[0], message: 'Lecturer updated' })
  } catch (error) {
    console.error('Error updating lecturer:', error)
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
        c.course_code, c.name as course_name,
        p.name as programme_name,
        at.name as term_name,
        ay.name as year_name
      FROM course_assignments ca
      JOIN courses c ON ca.course_id = c.id
      JOIN programmes p ON c.programme_id = p.id
      JOIN academic_terms at ON ca.academic_term_id = at.id
      JOIN academic_years ay ON at.academic_year_id = ay.id
      WHERE ca.lecturer_id = $1
      ORDER BY ay.name DESC, at.name
    `, [id])
    res.json({ success: true, data: rows })
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
