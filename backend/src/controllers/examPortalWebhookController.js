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
      (exam_portal_id, erp_course_code, exam_title, start_time, end_time, duration_minutes, seb_file_base64, seb_config_key, gate_url, allow_file_upload, permitted_apps, seb_settings, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
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
  ])

  console.log(`[examPortalWebhook] Exam published: ${examTitle} (${erpCourseCode}) with ${permittedApps.length} permitted app(s), file upload: ${!!allowFileUpload}`)
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
      AND sep.used = false
  `, [pin])

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'PIN not found or expired' })
  }

  const row = result.rows[0]

  // Mark the PIN as used (one-time only)
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
 * We store into the grades table of the ERP.
 */
export const handleGradeSubmitted = asyncHandler(async (req, res) => {
  const {
    studentRegNumber,
    erpCourseCode,
    examId,
    marksAwarded,
    totalMarks,
    examTitle,
  } = req.body

  if (!studentRegNumber || !erpCourseCode || marksAwarded === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required grade fields' })
  }

  // Find the student and course registration to link the grade
  const studentRes = await pool.query(
    'SELECT id FROM students WHERE registration_number = $1',
    [studentRegNumber]
  )
  if (studentRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: `Student not found: ${studentRegNumber}` })
  }

  const studentId = studentRes.rows[0].id

  const courseRes = await pool.query(
    'SELECT id FROM courses WHERE course_code = $1',
    [erpCourseCode]
  )
  if (courseRes.rows.length === 0) {
    // Log it but don't fail — we can't always guarantee the course exists
    console.warn(`[examPortalWebhook] Course not found in ERP: ${erpCourseCode}`)
    return res.json({ success: true, message: 'Grade acknowledged but course not found in ERP — no grade record created' })
  }

  const courseId = courseRes.rows[0].id

  // Find the course registration to attach the grade
  const regRes = await pool.query(
    'SELECT id FROM course_registrations WHERE student_id = $1 AND course_id = $2',
    [studentId, courseId]
  )

  if (regRes.rows.length === 0) {
    console.warn(`[examPortalWebhook] No course registration found for student=${studentRegNumber} course=${erpCourseCode}`)
    return res.json({ success: true, message: 'Grade acknowledged but no course registration found' })
  }

  const registrationId = regRes.rows[0].id

  // Upsert: online_exam source to differentiate from other grade types
  // grades table has UNIQUE on course_registration_id — one grade record per registration
  await pool.query(`
    INSERT INTO grades 
      (course_registration_id, exam_mark, final_score, grade_letter)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (course_registration_id) DO UPDATE SET
      exam_mark   = EXCLUDED.exam_mark,
      final_score = EXCLUDED.final_score,
      updated_at  = NOW()
  `, [registrationId, marksAwarded, marksAwarded, null])

  console.log(`[examPortalWebhook] Grade saved: ${studentRegNumber} → ${erpCourseCode}: ${marksAwarded}`)
  res.json({ success: true, message: 'Grade recorded in ERP' })
})
