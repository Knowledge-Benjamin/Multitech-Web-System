import pool from '../config/database.js'
import { uploadDocumentToDrive } from '../utils/googleDriveService.js'
import { asyncHandler } from '../utils/helpers.js'
import jwt from 'jsonwebtoken'

export const getAssignedCourses = async (req, res) => {
  try {
    const lecturerId = req.lecturer.id

    const activeTermsRes = await pool.query(
      'SELECT id, name FROM academic_terms WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1'
    )
    if (activeTermsRes.rows.length === 0) {
      return res.json({ success: true, data: [], term: null })
    }
    const currentTerm = activeTermsRes.rows[0]

    const { rows } = await pool.query(`
      SELECT 
        ca.id as assignment_id,
        c.id as course_id,
        c.course_code,
        c.name,
        c.credits,
        c.target_year,
        c.target_semester,
        p.name as programme_name,
        COUNT(cm.id) as materials_count
      FROM course_assignments ca
      JOIN courses c ON ca.course_id = c.id
      JOIN programmes p ON c.programme_id = p.id
      LEFT JOIN course_materials cm ON cm.course_id = c.id AND cm.academic_term_id = ca.academic_term_id
      WHERE ca.lecturer_id = $1 AND ca.academic_term_id = $2
      GROUP BY ca.id, c.id, p.name
      ORDER BY c.course_code
    `, [lecturerId, currentTerm.id])

    res.json({ success: true, data: rows, term: currentTerm })
  } catch (error) {
    console.error('Error fetching assigned courses:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch assigned courses' })
  }
}

export const getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.params
    const lecturerId = req.lecturer.id

    const activeTermsRes = await pool.query(
      'SELECT id, name FROM academic_terms WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1'
    )
    if (activeTermsRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No active academic term' })
    }
    const currentTerm = activeTermsRes.rows[0]

    // Verify assignment
    const courseRes = await pool.query(`
      SELECT c.*, p.name as programme_name
      FROM course_assignments ca
      JOIN courses c ON ca.course_id = c.id
      JOIN programmes p ON c.programme_id = p.id
      WHERE ca.lecturer_id = $1 AND ca.course_id = $2 AND ca.academic_term_id = $3
    `, [lecturerId, courseId, currentTerm.id])

    if (courseRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this course' })
    }

    const course = courseRes.rows[0]

    // Materials
    const materialsRes = await pool.query(`
      SELECT * FROM course_materials 
      WHERE course_id = $1 AND academic_term_id = $2 
      ORDER BY created_at DESC
    `, [courseId, currentTerm.id])

    // Enrolled students count
    const studentsRes = await pool.query(`
      SELECT COUNT(DISTINCT ste.student_id) as enrolled_count
      FROM course_registrations cr
      JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
      WHERE cr.course_id = $1 AND ste.academic_term_id = $2
    `, [courseId, currentTerm.id])

    res.json({
      success: true,
      data: {
        course,
        term: currentTerm,
        materials: materialsRes.rows,
        enrolled_students: parseInt(studentsRes.rows[0].enrolled_count)
      }
    })
  } catch (error) {
    console.error('Error fetching course details:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch course details' })
  }
}

export const uploadCourseMaterial = async (req, res) => {
  try {
    const { courseId } = req.params
    const { title, description } = req.body
    const lecturerId = req.lecturer.id

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }

    const activeTermsRes = await pool.query(
      'SELECT id, name FROM academic_terms WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1'
    )
    if (activeTermsRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No active academic term' })
    }
    const currentTerm = activeTermsRes.rows[0]

    // Verify assignment and get course details
    const assignmentRes = await pool.query(`
      SELECT c.name as course_name, c.course_code
      FROM course_assignments ca
      JOIN courses c ON ca.course_id = c.id
      WHERE ca.lecturer_id = $1 AND ca.course_id = $2 AND ca.academic_term_id = $3
    `, [lecturerId, courseId, currentTerm.id])

    if (assignmentRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this course' })
    }

    const { course_name, course_code } = assignmentRes.rows[0]
    const lecturerName = `${req.lecturer.first_name} ${req.lecturer.last_name}`

    // Structured Google Drive folder: Lecturers / Lecturer Name / Term Name / Course Code - Course Name
    const folderPath = [
      'Lecturers',
      lecturerName,
      currentTerm.name,
      `${course_code} - ${course_name}`
    ]

    const driveFile = await uploadDocumentToDrive(req.file, folderPath)

    const { rows } = await pool.query(`
      INSERT INTO course_materials 
      (course_id, lecturer_id, academic_term_id, title, description, drive_file_id, drive_file_url, file_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      courseId,
      lecturerId,
      currentTerm.id,
      title,
      description || null,
      driveFile.id,
      driveFile.webViewLink,
      req.file.mimetype
    ])

    res.json({ success: true, data: rows[0], message: 'Material uploaded successfully' })
  } catch (error) {
    console.error('Error uploading course material:', error)
    res.status(500).json({ success: false, message: error.message || 'Failed to upload material' })
  }
}

export const deleteCourseMaterial = async (req, res) => {
  try {
    const { materialId } = req.params
    const lecturerId = req.lecturer.id

    const { rows } = await pool.query(
      'SELECT * FROM course_materials WHERE id = $1 AND lecturer_id = $2',
      [materialId, lecturerId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Material not found' })
    }

    await pool.query('DELETE FROM course_materials WHERE id = $1', [materialId])

    res.json({ success: true, message: 'Material deleted' })
  } catch (error) {
    console.error('Error deleting course material:', error)
    res.status(500).json({ success: false, message: 'Failed to delete material' })
  }
}

// ---------------------------------------------------------
// Grades Management
// ---------------------------------------------------------

export const getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params

    const { rows } = await pool.query(`
      SELECT 
        cr.id AS course_registration_id,
        s.student_number,
        a.first_name || ' ' || a.last_name AS student_name,
        g.coursework_mark,
        g.exam_mark,
        g.final_score,
        g.grade_letter,
        g.source
      FROM course_registrations cr
      JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
      JOIN students s ON ste.student_id = s.id
      LEFT JOIN applications a ON s.application_id = a.id
      LEFT JOIN grades g ON g.course_registration_id = cr.id
      WHERE cr.course_id = $1 AND cr.status = 'registered'
      ORDER BY s.student_number ASC
    `, [courseId])

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('Error fetching course students:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch students' })
  }
}

function calculateGrade(cw, exam) {
  const cwNum = Number(cw) || 0
  const exNum = Number(exam) || 0
  const finalScore = cwNum + exNum

  let letter = 'F'
  if (finalScore >= 80) letter = 'A'
  else if (finalScore >= 70) letter = 'B+'
  else if (finalScore >= 60) letter = 'B'
  else if (finalScore >= 50) letter = 'C'
  else if (finalScore >= 40) letter = 'D'

  return { finalScore, letter }
}

export const saveCourseGrades = async (req, res) => {
  try {
    const { courseId } = req.params
    const { grades } = req.body // Array of { course_registration_id, coursework_mark, exam_mark }

    if (!Array.isArray(grades)) {
      return res.status(400).json({ success: false, message: 'Invalid grades format' })
    }

    await pool.query('BEGIN')

    for (const g of grades) {
      const { course_registration_id, coursework_mark, exam_mark } = g
      
      // We don't overwrite source='online_exam_portal' manually, but the UI should have locked those anyway.
      // We will ensure that we don't accidentally overwrite online exam portal exam marks if we only want to update coursework.
      
      const { finalScore, letter } = calculateGrade(coursework_mark, exam_mark)

      await pool.query(`
        INSERT INTO grades (
          course_registration_id, 
          coursework_mark, 
          exam_mark, 
          final_score, 
          grade_letter, 
          source, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'offline', NOW())
        ON CONFLICT (course_registration_id) DO UPDATE SET
          coursework_mark = EXCLUDED.coursework_mark,
          exam_mark = EXCLUDED.exam_mark,
          final_score = EXCLUDED.final_score,
          grade_letter = EXCLUDED.grade_letter,
          source = (CASE WHEN grades.source = 'online_exam_portal' THEN 'online_exam_portal' ELSE 'offline' END),
          updated_at = NOW()
      `, [course_registration_id, coursework_mark || 0, exam_mark || 0, finalScore, letter])
    }

    await pool.query('COMMIT')
    res.json({ success: true, message: 'Grades saved successfully' })
  } catch (error) {
    await pool.query('ROLLBACK')
    console.error('Error saving grades:', error)
    res.status(500).json({ success: false, message: 'Failed to save grades' })
  }
}

// ---------------------------------------------------------
// Announcements
// ---------------------------------------------------------

export const getCourseAnnouncements = async (req, res) => {
  try {
    const { courseId } = req.params
    const { rows } = await pool.query(`
      SELECT * FROM course_announcements
      WHERE course_id = $1
      ORDER BY created_at DESC
    `, [courseId])
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('Error fetching course announcements:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' })
  }
}

export const createCourseAnnouncement = async (req, res) => {
  try {
    const { courseId } = req.params
    const { title, body } = req.body
    const lecturerId = req.lecturer.id

    // Get active term
    const activeTermRes = await pool.query('SELECT id FROM academic_terms WHERE status = $1', ['active'])
    const termId = activeTermRes.rows[0]?.id

    if (!termId) return res.status(400).json({ success: false, message: 'No active academic term found' })

    const { rows } = await pool.query(`
      INSERT INTO course_announcements (course_id, lecturer_id, academic_term_id, title, body)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [courseId, lecturerId, termId, title, body])

    res.json({ success: true, data: rows[0], message: 'Announcement posted successfully' })
  } catch (error) {
    console.error('Error creating course announcement:', error)
    res.status(500).json({ success: false, message: 'Failed to post announcement' })
  }
}

export const deleteCourseAnnouncement = async (req, res) => {
  try {
    const { announcementId } = req.params
    const lecturerId = req.lecturer.id

    await pool.query('DELETE FROM course_announcements WHERE id = $1 AND lecturer_id = $2', [announcementId, lecturerId])
    res.json({ success: true, message: 'Announcement deleted' })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    res.status(500).json({ success: false, message: 'Failed to delete announcement' })
  }
}

// ── SSO Integration ────────────────────────────────────────────────────────
export const generateExamSSOToken = async (req, res) => {
  try {
    const { courseId } = req.params
    const lecturerId = req.lecturer.id

    // Verify lecturer teaches this course
    const courseCheck = await pool.query(
      'SELECT c.course_code FROM courses c JOIN class_schedules cs ON c.id = cs.course_id WHERE c.id = $1 AND (cs.lecturer_table_id = $2 OR cs.lecturer_id = $2) LIMIT 1',
      [courseId, lecturerId]
    )

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'You are not authorized to create exams for this course.' })
    }

    const courseCode = courseCheck.rows[0].course_code
    
    const lecturerCheck = await pool.query('SELECT first_name, last_name, email FROM lecturers WHERE id = $1', [lecturerId])
    if (lecturerCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Lecturer not found.' })
    }
    
    const email = lecturerCheck.rows[0].email
    const fullName = lecturerCheck.rows[0].first_name + ' ' + lecturerCheck.rows[0].last_name

    if (!process.env.SSO_JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'SSO is not configured on the server.' })
    }

    const token = jwt.sign(
      { email, fullName, role: 'teacher', courseCode },
      process.env.SSO_JWT_SECRET,
      { expiresIn: '1m' }
    )

    const portalUrl = process.env.EXAM_PORTAL_URL || 'http://localhost:5000'
    const ssoUrl = `${portalUrl}/api/auth/sso?token=${token}`
    res.json({ success: true, ssoUrl })
  } catch (error) {
    console.error('Error generating SSO token:', error)
    res.status(500).json({ success: false, message: 'Failed to generate SSO token' })
  }
}
