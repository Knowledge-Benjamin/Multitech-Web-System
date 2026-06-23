import pool from '../config/database.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { asyncHandler, validateRequired } from '../utils/helpers.js'

// Execute JIT Auto-Advancement Algorithm
const executeAutoAdvancement = async (studentId) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Get the currently active academic term
    const termRes = await client.query(
      `SELECT * FROM academic_terms WHERE CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1`
    )
    if (termRes.rows.length === 0) {
      // No active term globally, so do nothing
      await client.query('COMMIT')
      return null
    }
    const currentTerm = termRes.rows[0]

    // 2. Check if student already has an enrollment for this term
    const enrollmentRes = await client.query(
      `SELECT * FROM student_term_enrollments WHERE student_id = $1 AND academic_term_id = $2`,
      [studentId, currentTerm.id]
    )
    if (enrollmentRes.rows.length > 0) {
      // Already enrolled for current term, no advancement needed
      await client.query('COMMIT')
      return enrollmentRes.rows[0]
    }

    // 3. Get student's previous term enrollment to determine next step
    const prevEnrollmentRes = await client.query(
      `SELECT * FROM student_term_enrollments 
       WHERE student_id = $1 
       ORDER BY id DESC LIMIT 1`,
      [studentId]
    )

    let newStudyYear = 1
    let newStudySemester = 1
    let progressionStatus = 'normal'

    if (prevEnrollmentRes.rows.length > 0) {
      const prev = prevEnrollmentRes.rows[0]
      if (prev.progression_status === 'dead_semester') {
        // Repeat the same year/semester
        newStudyYear = prev.study_year
        newStudySemester = prev.study_semester
      } else if (prev.progression_status === 'retake') {
        // Might advance chronologically but still flagged for retakes. 
        // For simplicity in JIT, we advance them but flag them as retake.
        newStudySemester = prev.study_semester === 1 ? 2 : 1
        newStudyYear = prev.study_semester === 1 ? prev.study_year : prev.study_year + 1
        progressionStatus = 'retake'
      } else {
        // Normal advancement
        newStudySemester = prev.study_semester === 1 ? 2 : 1
        newStudyYear = prev.study_semester === 1 ? prev.study_year : prev.study_year + 1
      }
    } else {
      // First time enrollment. We should probably get intake_term_id from students table, but for now Year 1 Sem 1
      // Check if student record actually exists
      const studentRecord = await client.query(`SELECT status FROM applications a JOIN student_accounts sa ON sa.application_id = a.id WHERE sa.id = (SELECT student_account_id FROM students WHERE id = $1 LIMIT 1)`, [studentId])
      // If student is not admitted, they shouldn't even have a student record, but we'll assume they do.
    }

    // 4. Create new enrollment
    const newEnrollmentRes = await client.query(`
      INSERT INTO student_term_enrollments (student_id, academic_term_id, study_year, study_semester, progression_status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [studentId, currentTerm.id, newStudyYear, newStudySemester, progressionStatus])

    const newEnrollment = newEnrollmentRes.rows[0]

    // 5. Generate Invoices (Tuition + Functional)
    // We need the student's programme to get tuition fees
    const studentDataRes = await client.query(`
      SELECT p.national_tuition_fee, p.international_tuition_fee, a.country_of_residence 
      FROM students s
      JOIN programmes p ON s.programme_id = p.id
      JOIN student_accounts sa ON s.student_account_id = sa.id
      JOIN applications a ON sa.application_id = a.id
      WHERE s.id = $1
    `, [studentId])

    if (studentDataRes.rows.length > 0) {
      const sData = studentDataRes.rows[0]
      const isInternational = sData.country_of_residence && sData.country_of_residence.toLowerCase() !== 'uganda'
      const tuitionFee = isInternational ? sData.international_tuition_fee : sData.national_tuition_fee
      const currency = isInternational ? 'USD' : 'UGX'

      // Invoice Tuition
      if (tuitionFee && tuitionFee > 0) {
        await client.query(`
          INSERT INTO invoices (student_id, academic_term_id, amount, currency, fee_type, description, due_date)
          VALUES ($1, $2, $3, $4, 'tuition', $5, $6)
        `, [studentId, currentTerm.id, tuitionFee, currency, `Tuition Fee - Year ${newStudyYear} Sem ${newStudySemester}`, currentTerm.end_date])
      }

      // Invoice Functional Fees
      const funcFeesRes = await client.query(`SELECT * FROM functional_fees WHERE active = true`)
      for (const f of funcFeesRes.rows) {
        const funcAmount = isInternational ? f.international_amount : f.national_amount
        if (funcAmount && funcAmount > 0) {
          await client.query(`
            INSERT INTO invoices (student_id, academic_term_id, amount, currency, fee_type, description, due_date)
            VALUES ($1, $2, $3, $4, 'functional', $5, $6)
          `, [studentId, currentTerm.id, funcAmount, currency, f.fee_name, currentTerm.end_date])
        }
      }
    }

    await client.query('COMMIT')
    return newEnrollment

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('JIT Auto-Advancement Error:', err)
    return null
  } finally {
    client.release()
  }
}

// Student Login
export const loginStudent = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const validationError = validateRequired(['email', 'password'], { email, password })
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError })
  }

  // Find account
  const result = await pool.query(
    'SELECT * FROM student_accounts WHERE email = $1',
    [email]
  )

  if (result.rows.length === 0) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' })
  }

  const account = result.rows[0]
  const passwordMatch = await bcrypt.compare(password, account.password_hash)

  if (!passwordMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' })
  }

  // Get application status
  const appRes = await pool.query('SELECT status, first_name, last_name, id FROM applications WHERE id = $1', [account.application_id])
  const application = appRes.rows[0]

  // If admitted, they should have a record in the 'students' table.
  let studentId = null
  let studentNumber = null
  if (application && application.status === 'admitted') {
    const studentRes = await pool.query('SELECT id, student_number FROM students WHERE student_account_id = $1', [account.id])
    if (studentRes.rows.length > 0) {
      studentId = studentRes.rows[0].id
      studentNumber = studentRes.rows[0].student_number
      // Trigger JIT Auto-Advancement since they are an active student logging in
      await executeAutoAdvancement(studentId)
    }
  }

  const token = jwt.sign(
    { 
      id: account.id, 
      email: account.email,
      studentId: studentId,
      applicationId: account.application_id,
      role: 'student'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.json({
    success: true,
    message: 'Login successful',
    token,
    student: {
      id: account.id,
      email: account.email,
      name: application ? `${application.first_name} ${application.last_name}` : 'Student',
      must_change_password: account.must_change_password,
      application_status: application ? application.status : 'pending',
      student_id_db: studentId,
      student_number: studentNumber
    }
  })
})

// Change Password on First Login
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body
  const accountId = req.student.id // Set by auth middleware

  const validationError = validateRequired(['oldPassword', 'newPassword'], { oldPassword, newPassword })
  if (validationError) return res.status(400).json({ success: false, message: validationError })

  const result = await pool.query('SELECT * FROM student_accounts WHERE id = $1', [accountId])
  if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Account not found' })
  
  const account = result.rows[0]
  const isMatch = await bcrypt.compare(oldPassword, account.password_hash)
  if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect old password' })

  const salt = await bcrypt.genSalt(10)
  const hashed = await bcrypt.hash(newPassword, salt)

  await pool.query('UPDATE student_accounts SET password_hash = $1, must_change_password = false, updated_at = NOW() WHERE id = $2', [hashed, accountId])

  res.json({ success: true, message: 'Password updated successfully' })
})
