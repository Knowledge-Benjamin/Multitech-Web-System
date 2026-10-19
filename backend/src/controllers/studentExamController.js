import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

/**
 * GET /api/student-profile/exams
 *
 * Returns all exams available to the logged-in student based on their
 * registered courses. Includes the base64 SEB file so the frontend can
 * offer a direct download button without a separate request.
 */
export const getMyExams = asyncHandler(async (req, res) => {
  const { studentId } = req.student
  if (!studentId) return res.status(404).json({ success: false, message: 'Student record not found.' })

  // Get all course codes the student is registered for
  const courseRes = await pool.query(`
    SELECT c.course_code
    FROM course_registrations cr
    JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
    JOIN courses c ON cr.course_id = c.id
    WHERE ste.student_id = $1 AND cr.status = 'registered'
  `, [studentId])

  const courseCodes = courseRes.rows.map(r => r.course_code)

  if (courseCodes.length === 0) {
    return res.json({ success: true, data: [] })
  }

  // Fetch all active exams that match the student's registered courses
  const placeholders = courseCodes.map((_, i) => `$${i + 2}`).join(', ')
  const examsRes = await pool.query(`
    SELECT DISTINCT ON (e.id)
      e.id,
      e.exam_portal_id,
      e.erp_course_code,
      e.exam_title,
      e.start_time,
      e.end_time,
      e.duration_minutes,
      e.status,
      e.gate_url,
      e.seb_config_key,
      e.allow_file_upload,
      e.permitted_apps,
      e.seb_settings,
      e.assessment_type,
      e.weight_percentage,
      -- Only include the SEB file if the exam is active and within or approaching the window
      CASE 
        WHEN e.status = 'active' AND e.end_time > NOW() THEN e.seb_file_base64 
        ELSE NULL 
      END AS seb_file_base64,
      e.created_at,
      e.updated_at,
      g.coursework_mark,
      g.exam_mark,
      g.final_score,
      g.grade_letter,
      g.source AS grade_source
    FROM erp_exams e
    LEFT JOIN courses c ON c.course_code = e.erp_course_code
    LEFT JOIN course_registrations cr ON cr.course_id = c.id AND cr.status = 'registered'
    LEFT JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id AND ste.student_id = $1
    LEFT JOIN grades g ON g.course_registration_id = cr.id
    WHERE e.erp_course_code = ANY(ARRAY[${placeholders}]::text[])
      AND e.status != 'archived'
    ORDER BY e.id, e.start_time ASC
  `, [studentId, ...courseCodes])

  res.json({ success: true, data: examsRes.rows })
})
