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
  const placeholders = courseCodes.map((_, i) => `$${i + 1}`).join(', ')
  const examsRes = await pool.query(`
    SELECT 
      id,
      exam_portal_id,
      erp_course_code,
      exam_title,
      start_time,
      end_time,
      duration_minutes,
      status,
      gate_url,
      seb_config_key,
      allow_file_upload,
      permitted_apps,
      seb_settings,
      -- Only include the SEB file if the exam is active and within or approaching the window
      CASE 
        WHEN status = 'active' AND end_time > NOW() THEN seb_file_base64 
        ELSE NULL 
      END AS seb_file_base64,
      created_at,
      updated_at
    FROM erp_exams
    WHERE erp_course_code = ANY(ARRAY[${placeholders}]::text[])
      AND status != 'archived'
    ORDER BY start_time ASC
  `, courseCodes)

  res.json({ success: true, data: examsRes.rows })
})
