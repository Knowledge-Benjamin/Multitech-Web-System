import pool from '../config/database.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const { rows } = await pool.query('SELECT * FROM lecturers WHERE email = $1', [email])
    
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const lecturer = rows[0]
    
    if (!lecturer.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' })
    }

    const isMatch = await bcrypt.compare(password, lecturer.password_hash)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: lecturer.id, email: lecturer.email, role: 'lecturer' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      success: true,
      token,
      lecturer: {
        id: lecturer.id,
        first_name: lecturer.first_name,
        last_name: lecturer.last_name,
        email: lecturer.email
      }
    })
  } catch (error) {
    console.error('Lecturer login error:', error)
    res.status(500).json({ success: false, message: 'Server error during login' })
  }
}

export const getDashboardStats = async (req, res) => {
  try {
    const lecturerId = req.lecturer.id

    const activeTermsRes = await pool.query('SELECT id FROM academic_terms WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1')
    const currentTermId = activeTermsRes.rows.length > 0 ? activeTermsRes.rows[0].id : null

    let coursesCount = 0
    if (currentTermId) {
      const { rows } = await pool.query(
        'SELECT COUNT(*) FROM course_assignments WHERE lecturer_id = $1 AND academic_term_id = $2',
        [lecturerId, currentTermId]
      )
      coursesCount = parseInt(rows[0].count)
    }

    res.json({
      success: true,
      data: {
        active_courses: coursesCount
      }
    })
  } catch (error) {
    console.error('Lecturer stats error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch stats' })
  }
}
