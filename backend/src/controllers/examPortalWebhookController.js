import crypto from 'crypto'
import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'
import bcrypt from 'bcryptjs'

const WEBHOOK_SECRET = process.env.EXAM_PORTAL_WEBHOOK_SECRET || 'multitech_erp_exam_portal_webhook_secret_2024'

// ─── Signature Verification ───────────────────────────────────────────────────

function verifySignature(body, signature) {
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

// Middleware: raw body needed for HMAC
export const requireWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-erp-signature']
  if (!signature) {
    return res.status(401).json({ success: false, message: 'Missing webhook signature' })
  }
  // req.rawBody is set by express.json({ verify }) in server.js
  const rawBody = req.rawBody || JSON.stringify(req.body)
  if (!verifySignature(rawBody, signature)) {
    return res.status(401).json({ success: false, message: 'Invalid webhook signature' })
  }
  next()
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /api/exam-portal/webhook/exam-published
 *
 * Exam Portal calls this when a teacher generates a SEB file.
 * We upsert into erp_exams so students can see and download the exam.
 */
export const handleExamPublished = asyncHandler(async (req, res) => {
  const {
    examId,
    erpCourseCode,
    examTitle,
    startTime,
    endTime,
    durationMinutes,
    sebFileBase64,
    sebConfigKey,
    gateUrl,
    allowFileUpload = false,
    sebSettings = {},
    assessmentType = 'final_exam',
    weightPercentage = 60,
  } = req.body

  if (!examId || !erpCourseCode || !sebFileBase64) {
    return res.status(400).json({ success: false, message: 'Missing required fields: examId, erpCourseCode, sebFileBase64' })
  }

  const permittedApps = Array.isArray(sebSettings?.permittedProcesses)
    ? sebSettings.permittedProcesses
    : []

  // Upsert: if we already have this exam, update it (teacher may regenerate SEB file)
  await pool.query(`
    INSERT INTO erp_exams 
      (exam_portal_id, erp_course_code, exam_title, start_time, end_time, duration_minutes, seb_file_base64, seb_config_key, gate_url, allow_file_upload, permitted_apps, seb_settings, assessment_type, weight_percentage, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active')
    ON CONFLICT (exam_portal_id) DO UPDATE SET
      erp_course_code   = EXCLUDED.erp_course_code,
      exam_title        = EXCLUDED.exam_title,
      start_time        = EXCLUDED.start_time,
      end_time          = EXCLUDED.end_time,
      duration_minutes  = EXCLUDED.duration_minutes,
      seb_file_base64   = EXCLUDED.seb_file_base64,
      seb_config_key    = EXCLUDED.seb_config_key,
      gate_url          = EXCLUDED.gate_url,
      allow_file_upload = EXCLUDED.allow_file_upload,
      permitted_apps    = EXCLUDED.permitted_apps,
      seb_settings      = EXCLUDED.seb_settings,
      assessment_type   = EXCLUDED.assessment_type,
      weight_percentage = EXCLUDED.weight_percentage,
      status            = 'active',
      updated_at        = NOW()
  `, [
    examId,
    erpCourseCode,
    examTitle,
    startTime,
    endTime,
    durationMinutes,
    sebFileBase64,
    sebConfigKey,
    gateUrl,
    !!allowFileUpload,
    JSON.stringify(permittedApps),
    JSON.stringify(sebSettings),
    assessmentType,
    Number(weightPercentage) || 60,
  ])

  console.log(`[examPortalWebhook] Exam published: ${examTitle} (${erpCourseCode}) [${assessmentType}, ${weightPercentage}%] with ${permittedApps.length} permitted app(s), file upload: ${!!allowFileUpload}`)
  res.json({ success: true, message: 'Exam record stored in ERP' })
})

/**
 * POST /api/exam-portal/webhook/verify-pin
 *
 * Exam Portal calls this to verify a student's one-time PIN.
 * Returns the student's canonical identity if valid, 404 if not found/expired.
 */
export const handleVerifyPin = asyncHandler(async (req, res) => {
  const { pin } = req.body

  if (!pin || !/^\d{6}$/.test(pin)) {
    return res.status(400).json({ success: false, message: 'Invalid PIN format' })
  }

  const result = await pool.query(`
    SELECT sep.id, 
           s.student_number AS student_reg_number,
           COALESCE(a.first_name, '') AS first_name,
           COALESCE(a.last_name, '') AS last_name
    FROM student_exam_pins sep
    JOIN students s ON sep.student_id = s.id
    LEFT JOIN applications a ON s.application_id = a.id
    WHERE sep.pin = $1
      AND sep.expires_at > NOW()
  `, [pin])

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'PIN not found or expired' })
  }

  const row = result.rows[0]

  // Record that this PIN has been activated for an exam session
  await pool.query(
    'UPDATE student_exam_pins SET used = true WHERE id = $1',
    [row.id]
  )

  res.json({
    success: true,
    studentRegNumber: row.student_reg_number,
    studentName: `${row.first_name} ${row.last_name}`,
  })
})

/**
 * POST /api/exam-portal/webhook/teacher-provisioned
 *
 * ERP calls the Exam Portal to provision a new teacher. This is the reverse
 * direction stub — kept for parity if needed in the future.
 * (The actual teacher creation in Exam Portal is done by the exam portal's own auth routes)
 */
export const handleTeacherProvisioned = asyncHandler(async (req, res) => {
  // Stub — the ERP doesn't provision teachers in the Exam Portal directly.
  // Teacher accounts in the Exam Portal are created manually by the exam portal admin.
  res.json({ success: true, message: 'Acknowledged' })
})

/**
 * POST /api/exam-portal/webhook/grade-submitted
 *
 * Exam Portal pushes final scores here after a teacher marks a submission.
 * We scale and store into the grades table of the ERP according to assessmentType.
 */
export const handleGradeSubmitted = asyncHandler(async (req, res) => {
  const {
    studentRegNumber,
    erpCourseCode,
    examId,
    marksAwarded,
    totalMarks,
    examTitle,
    assessmentType = 'final_exam',
    weightPercentage = 60,
  } = req.body

  if (!studentRegNumber || !erpCourseCode || marksAwarded === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required grade fields' })
  }

  // 1. Find the student using student_number (canonical student identifier)
  const studentRes = await pool.query(
    'SELECT id FROM students WHERE student_number = $1',
    [studentRegNumber]
  )
  if (studentRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: `Student not found: ${studentRegNumber}` })
  }

  const studentId = studentRes.rows[0].id

  // 2. Find the course
  const courseRes = await pool.query(
    'SELECT id FROM courses WHERE course_code = $1',
    [erpCourseCode]
  )
  if (courseRes.rows.length === 0) {
    console.warn(`[examPortalWebhook] Course not found in ERP: ${erpCourseCode}`)
    return res.json({ success: true, message: 'Grade acknowledged but course not found in ERP — no grade record created' })
  }

  const courseId = courseRes.rows[0].id

  // 3. Find the course registration (through student_term_enrollments)
  const regRes = await pool.query(`
    SELECT cr.id 
    FROM course_registrations cr
    JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
    WHERE ste.student_id = $1 AND cr.course_id = $2
    LIMIT 1
  `, [studentId, courseId])

  if (regRes.rows.length === 0) {
    console.warn(`[examPortalWebhook] No course registration found for student=${studentRegNumber} course=${erpCourseCode}`)
    return res.json({ success: true, message: 'Grade acknowledged but no course registration found' })
  }

  const registrationId = regRes.rows[0].id

  // 4. Calculate the scaled mark according to assessmentType & weightPercentage
  // E.g. If coursework is 40%, marksAwarded = 80/100 -> (80 / 100) * 40 = 32.
  // If final_exam is 60%, marksAwarded = 50/100 -> (50 / 100) * 60 = 30.
  const total = Number(totalMarks) > 0 ? Number(totalMarks) : 100
  const weight = Number(weightPercentage) > 0 ? Number(weightPercentage) : (assessmentType === 'coursework' ? 40 : 60)
  const scaledMark = Math.round(((Number(marksAwarded) / total) * weight) * 100) / 100

  // 5. Query existing grade row so we don't erase the other component
  const existingRes = await pool.query(
    'SELECT id, coursework_mark, exam_mark, source FROM grades WHERE course_registration_id = $1',
    [registrationId]
  )
  const existing = existingRes.rows[0]

  let newCwMark = existing?.coursework_mark ?? null
  let newExamMark = existing?.exam_mark ?? null

  if (assessmentType === 'coursework') {
    newCwMark = scaledMark
  } else {
    // Default to final_exam
    newExamMark = scaledMark
  }

  // Compute final score
  const cwNum = Number(newCwMark) || 0
  const exNum = Number(newExamMark) || 0
  const finalScore = Math.round((cwNum + exNum) * 100) / 100

  // Standard institutional letter grade & grade points (5.0 scale)
  let gradeLetter = 'F'
  let gradePoints = 0.0
  if (finalScore >= 80) { gradeLetter = 'A'; gradePoints = 5.0 }
  else if (finalScore >= 70) { gradeLetter = 'B+'; gradePoints = 4.0 }
  else if (finalScore >= 60) { gradeLetter = 'B'; gradePoints = 3.0 }
  else if (finalScore >= 50) { gradeLetter = 'C'; gradePoints = 2.0 }
  else if (finalScore >= 40) { gradeLetter = 'D'; gradePoints = 1.0 }
  else { gradeLetter = 'F'; gradePoints = 0.0 }

  // 6. Upsert into grades
  await pool.query(`
    INSERT INTO grades 
      (course_registration_id, coursework_mark, exam_mark, final_score, grade_letter, grade_points, source, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, 'online_exam_portal', NOW())
    ON CONFLICT (course_registration_id) DO UPDATE SET
      coursework_mark = EXCLUDED.coursework_mark,
      exam_mark       = EXCLUDED.exam_mark,
      final_score     = EXCLUDED.final_score,
      grade_letter    = EXCLUDED.grade_letter,
      grade_points    = EXCLUDED.grade_points,
      source          = 'online_exam_portal',
      updated_at      = NOW()
  `, [registrationId, newCwMark, newExamMark, finalScore, gradeLetter, gradePoints])

  console.log(`[examPortalWebhook] Grade saved: ${studentRegNumber} (${erpCourseCode}): type=${assessmentType}, scaled=${scaledMark}/${weight}, totalFinal=${finalScore} (${gradeLetter})`)
  res.json({
    success: true,
    message: 'Grade recorded in ERP',
    data: {
      studentRegNumber,
      erpCourseCode,
      assessmentType,
      scaledMark,
      finalScore,
      gradeLetter
    }
  })
})
