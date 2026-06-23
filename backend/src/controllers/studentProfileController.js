import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

export const getMyProfile = asyncHandler(async (req, res) => {
  const { studentId } = req.student

  if (!studentId) {
    return res.status(404).json({ success: false, message: 'Student record not found. Are you fully admitted?' })
  }

  // 1. Basic Student Info
  const studentRes = await pool.query(`
    SELECT s.*, p.name AS programme_name, a.first_name, a.last_name, a.gender, a.date_of_birth, sa.email, a.phone
    FROM students s
    JOIN programmes p ON s.programme_id = p.id
    JOIN student_accounts sa ON s.student_account_id = sa.id
    JOIN applications a ON sa.application_id = a.id
    WHERE s.id = $1
  `, [studentId])

  const profile = studentRes.rows[0]

  // 2. Current Enrollment
  const currentEnrollmentRes = await pool.query(`
    SELECT ste.*, t.name AS term_name, y.name AS year_name 
    FROM student_term_enrollments ste
    JOIN academic_terms t ON ste.academic_term_id = t.id
    JOIN academic_years y ON t.academic_year_id = y.id
    WHERE ste.student_id = $1
    ORDER BY t.start_date DESC LIMIT 1
  `, [studentId])

  const currentEnrollment = currentEnrollmentRes.rows[0]

  // 3. Financials (Outstanding Balance)
  const invoicesRes = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) AS total_invoiced, currency
    FROM invoices 
    WHERE student_id = $1 AND status != 'paid' AND status != 'void'
    GROUP BY currency
  `, [studentId])

  const paymentsRes = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) AS total_paid, currency
    FROM payments 
    WHERE student_id = $1
    GROUP BY currency
  `, [studentId])

  let totalDue = 0
  let currency = 'UGX'

  if (invoicesRes.rows.length > 0) {
    currency = invoicesRes.rows[0].currency
    totalDue = parseFloat(invoicesRes.rows[0].total_invoiced)
    
    // Subtract total paid
    const paidMatch = paymentsRes.rows.find(p => p.currency === currency)
    if (paidMatch) {
      totalDue -= parseFloat(paidMatch.total_paid)
    }
  }

  res.json({
    success: true,
    data: {
      profile,
      currentEnrollment,
      financials: {
        currency,
        totalDue: Math.max(0, totalDue) // Don't show negative due if overpaid
      }
    }
  })
})

export const getMyInvoices = asyncHandler(async (req, res) => {
  const { studentId } = req.student
  if (!studentId) return res.status(404).json({ success: false, message: 'Student record not found.' })

  const invoicesRes = await pool.query(`
    SELECT i.*, t.name AS term_name
    FROM invoices i
    JOIN academic_terms t ON i.academic_term_id = t.id
    WHERE i.student_id = $1
    ORDER BY i.created_at DESC
  `, [studentId])

  res.json({ success: true, data: invoicesRes.rows })
})
