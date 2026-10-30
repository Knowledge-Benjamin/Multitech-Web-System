import pool from '../config/database.js'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const JWT_ALGORITHM = 'HS256'

// Helper: Check if a user has active verification delegation
export const verifyScannerPermission = async (req) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return { isAuthorized: false }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM]
    })

    // If admin or superadmin, automatically authorized
    if (decoded.role === 'admin' || decoded.role === 'superadmin') {
      return {
        isAuthorized: true,
        verifierType: 'admin',
        userId: decoded.id,
        verifierName: decoded.username || 'System Administrator',
        verifierEmail: decoded.email
      }
    }

    // Check delegations for email or user id
    const email = decoded.email
    if (!email) return { isAuthorized: false }

    const delegationQuery = await pool.query(`
      SELECT * FROM id_verifier_delegations
      WHERE LOWER(account_email) = LOWER($1)
        AND status = 'active'
        AND (valid_until IS NULL OR valid_until > NOW())
      ORDER BY id DESC LIMIT 1
    `, [email])

    if (delegationQuery.rows.length > 0) {
      const del = delegationQuery.rows[0]
      return {
        isAuthorized: true,
        verifierType: del.user_type,
        userId: del.user_id || decoded.id,
        verifierName: del.account_name,
        verifierEmail: del.account_email,
        delegationId: del.id,
        permissions: del.permissions
      }
    }

    return { isAuthorized: false }
  } catch (err) {
    return { isAuthorized: false }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SYNC ID CARDS WITH SYSTEM RECORDS
// ─────────────────────────────────────────────────────────────────────────────
export const syncIdCards = async (req, res) => {
  try {
    let studentCount = 0
    let lecturerCount = 0
    let staffCount = 0

    // A. Sync Enrolled Students
    const studentRows = await pool.query(`
      SELECT 
        s.id AS student_id,
        s.student_number,
        s.current_status,
        a.first_name,
        a.last_name,
        a.passport_photo_url,
        p.name AS programme_name
      FROM students s
      JOIN student_accounts sa ON s.student_account_id = sa.id
      JOIN applications a ON sa.application_id = a.id
      LEFT JOIN programmes p ON s.programme_id = p.id
    `)

    for (const stu of studentRows.rows) {
      const cardNumber = `MBS-STU-${String(stu.student_id).padStart(5, '0')}`
      const fullName = `${stu.first_name || ''} ${stu.last_name || ''}`.trim()
      const existing = await pool.query('SELECT id, qr_token FROM institutional_id_cards WHERE student_id = $1', [stu.student_id])

      if (existing.rows.length === 0) {
        const qrToken = crypto.randomBytes(24).toString('hex')
        await pool.query(`
          INSERT INTO institutional_id_cards (
            card_number, cardholder_type, student_id, cardholder_name,
            identifier_number, department_or_programme, role_title,
            photo_url, qr_token, barcode_value, expires_at
          ) VALUES ($1, 'student', $2, $3, $4, $5, 'Student', $6, $7, $8, NOW() + INTERVAL '3 years')
        `, [
          cardNumber,
          stu.student_id,
          fullName,
          stu.student_number || `STU-${stu.student_id}`,
          stu.programme_name || 'Academic Studies',
          stu.passport_photo_url,
          qrToken,
          stu.student_number || cardNumber
        ])
        studentCount++
      } else {
        // Update name, programme, or photo if changed
        await pool.query(`
          UPDATE institutional_id_cards
          SET cardholder_name = $1,
              department_or_programme = $2,
              photo_url = COALESCE($3, photo_url),
              identifier_number = COALESCE($4, identifier_number),
              updated_at = NOW()
          WHERE id = $5
        `, [
          fullName,
          stu.programme_name || 'Academic Studies',
          stu.passport_photo_url,
          stu.student_number,
          existing.rows[0].id
        ])
      }
    }

    // B. Sync Lecturers
    const lecturerRows = await pool.query(`
      SELECT id, first_name, last_name, email, is_active
      FROM lecturers
    `)

    for (const lec of lecturerRows.rows) {
      const cardNumber = `MBS-LEC-${String(lec.id).padStart(5, '0')}`
      const fullName = `${lec.first_name || ''} ${lec.last_name || ''}`.trim()
      const identifier = `LEC-${String(lec.id).padStart(4, '0')}`
      const existing = await pool.query('SELECT id FROM institutional_id_cards WHERE lecturer_id = $1', [lec.id])

      if (existing.rows.length === 0) {
        const qrToken = crypto.randomBytes(24).toString('hex')
        await pool.query(`
          INSERT INTO institutional_id_cards (
            card_number, cardholder_type, lecturer_id, cardholder_name,
            identifier_number, department_or_programme, role_title,
            qr_token, barcode_value, expires_at
          ) VALUES ($1, 'lecturer', $2, $3, $4, 'Faculty Academic Staff', 'Lecturer', $5, $6, NOW() + INTERVAL '2 years')
        `, [cardNumber, lec.id, fullName, identifier, qrToken, identifier])
        lecturerCount++
      } else {
        await pool.query(`
          UPDATE institutional_id_cards
          SET cardholder_name = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [fullName, existing.rows[0].id])
      }
    }

    // C. Sync Staff Members (Administrative & Support Staff)
    const staffRows = await pool.query(`SELECT * FROM staff_members WHERE status = 'active'`)

    for (const st of staffRows.rows) {
      const prefix = st.role_type === 'administrative' ? 'ADM' : 'SUP'
      const cardNumber = `MBS-${prefix}-${String(st.id).padStart(5, '0')}`
      const fullName = `${st.first_name || ''} ${st.last_name || ''}`.trim()
      const existing = await pool.query('SELECT id FROM institutional_id_cards WHERE staff_member_id = $1', [st.id])

      if (existing.rows.length === 0) {
        const qrToken = crypto.randomBytes(24).toString('hex')
        await pool.query(`
          INSERT INTO institutional_id_cards (
            card_number, cardholder_type, staff_member_id, cardholder_name,
            identifier_number, department_or_programme, role_title,
            photo_url, qr_token, barcode_value, blood_group, emergency_contact, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() + INTERVAL '3 years')
        `, [
          cardNumber,
          st.role_type,
          st.id,
          fullName,
          st.employee_number,
          st.department || 'Operations',
          st.job_title || (st.role_type === 'administrative' ? 'Administrative Staff' : 'Support Staff'),
          st.photo_url,
          qrToken,
          st.employee_number,
          st.blood_group,
          st.emergency_contact
        ])
        staffCount++
      } else {
        await pool.query(`
          UPDATE institutional_id_cards
          SET cardholder_name = $1,
              department_or_programme = $2,
              role_title = $3,
              photo_url = COALESCE($4, photo_url),
              blood_group = COALESCE($5, blood_group),
              updated_at = NOW()
          WHERE id = $6
        `, [fullName, st.department, st.job_title, st.photo_url, st.blood_group, existing.rows[0].id])
      }
    }

    const totalSynced = studentCount + lecturerCount + staffCount
    res.json({
      success: true,
      message: `ID Cards synchronization complete. ${totalSynced} new cards issued or refreshed.`,
      stats: {
        new_students: studentCount,
        new_lecturers: lecturerCount,
        new_staff: staffCount,
        total_created: totalSynced
      }
    })
  } catch (error) {
    console.error('Error syncing ID cards:', error)
    res.status(500).json({ success: false, message: 'Failed to sync ID cards: ' + error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET ID CARDS (Registry view with filters & pagination)
// ─────────────────────────────────────────────────────────────────────────────
export const getIdCards = async (req, res) => {
  try {
    const { cardholder_type, print_status, status, search, page = 1, limit = 50 } = req.query
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10)

    let query = `
      SELECT c.*
      FROM institutional_id_cards c
      WHERE 1=1
    `
    const params = []
    let idx = 1

    if (cardholder_type && cardholder_type !== 'all') {
      query += ` AND c.cardholder_type = $${idx++}`
      params.push(cardholder_type)
    }

    if (print_status && print_status !== 'all') {
      query += ` AND c.print_status = $${idx++}`
      params.push(print_status)
    }

    if (status && status !== 'all') {
      query += ` AND c.status = $${idx++}`
      params.push(status)
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`
      query += ` AND (
        c.cardholder_name ILIKE $${idx} OR
        c.identifier_number ILIKE $${idx} OR
        c.card_number ILIKE $${idx} OR
        c.department_or_programme ILIKE $${idx}
      )`
      params.push(s)
      idx++
    }

    // Get total count
    const countResult = await pool.query(`SELECT COUNT(*) as total FROM (${query}) q`, params)
    const total = parseInt(countResult.rows[0].total, 10)

    // Append ordering and pagination
    query += ` ORDER BY c.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`
    params.push(parseInt(limit, 10), offset)

    const cardsResult = await pool.query(query, params)

    // Summary statistics for headers
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_cards,
        COUNT(*) FILTER (WHERE print_status = 'queued') as queued_prints,
        COUNT(*) FILTER (WHERE print_status = 'printed') as printed_cards,
        COUNT(*) FILTER (WHERE cardholder_type = 'student') as students_count,
        COUNT(*) FILTER (WHERE cardholder_type = 'lecturer') as lecturers_count,
        COUNT(*) FILTER (WHERE cardholder_type = 'administrative') as admin_count,
        COUNT(*) FILTER (WHERE cardholder_type = 'support_staff') as support_count
      FROM institutional_id_cards
    `)

    res.json({
      success: true,
      data: cardsResult.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      },
      stats: statsResult.rows[0]
    })
  } catch (error) {
    console.error('Error fetching ID cards:', error)
    res.status(500).json({ success: false, message: 'Failed to retrieve ID cards' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET SINGLE CARD DETAILS & LOGS
// ─────────────────────────────────────────────────────────────────────────────
export const getIdCardById = async (req, res) => {
  try {
    const { id } = req.params
    const cardResult = await pool.query('SELECT * FROM institutional_id_cards WHERE id = $1', [id])
    if (cardResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Card not found' })
    }

    const card = cardResult.rows[0]
    const logsResult = await pool.query(`
      SELECT * FROM id_verification_logs
      WHERE card_id = $1
      ORDER BY scanned_at DESC
      LIMIT 20
    `, [id])

    res.json({
      success: true,
      data: {
        card,
        verification_history: logsResult.rows
      }
    })
  } catch (error) {
    console.error('Error fetching card:', error)
    res.status(500).json({ success: false, message: 'Failed to retrieve card details' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET MY CARD (For authenticated Student or Lecturer)
// ─────────────────────────────────────────────────────────────────────────────
export const getMyCard = async (req, res) => {
  try {
    let card = null

    if (req.student) {
      const studentId = req.student.id || req.student.studentId
      const result = await pool.query('SELECT * FROM institutional_id_cards WHERE student_id = $1', [studentId])
      if (result.rows.length > 0) {
        card = result.rows[0]
      } else {
        // Auto-generate if missing
        const sRes = await pool.query(`
          SELECT s.id, s.student_number, a.first_name, a.last_name, a.passport_photo_url, p.name as programme_name
          FROM students s
          JOIN student_accounts sa ON s.student_account_id = sa.id
          JOIN applications a ON sa.application_id = a.id
          LEFT JOIN programmes p ON s.programme_id = p.id
          WHERE s.id = $1
        `, [studentId])

        if (sRes.rows.length > 0) {
          const s = sRes.rows[0]
          const qrToken = crypto.randomBytes(24).toString('hex')
          const cardNum = `MBS-STU-${String(s.id).padStart(5, '0')}`
          const ins = await pool.query(`
            INSERT INTO institutional_id_cards (
              card_number, cardholder_type, student_id, cardholder_name,
              identifier_number, department_or_programme, role_title,
              photo_url, qr_token, barcode_value, expires_at
            ) VALUES ($1, 'student', $2, $3, $4, $5, 'Student', $6, $7, $8, NOW() + INTERVAL '3 years')
            RETURNING *
          `, [cardNum, s.id, `${s.first_name} ${s.last_name}`, s.student_number, s.programme_name || 'Academic Studies', s.passport_photo_url, qrToken, s.student_number])
          card = ins.rows[0]
        }
      }
    } else if (req.lecturer) {
      const lecturerId = req.lecturer.id || req.lecturer.lecturerId
      const result = await pool.query('SELECT * FROM institutional_id_cards WHERE lecturer_id = $1', [lecturerId])
      if (result.rows.length > 0) {
        card = result.rows[0]
      } else {
        const lRes = await pool.query('SELECT id, first_name, last_name, email FROM lecturers WHERE id = $1', [lecturerId])
        if (lRes.rows.length > 0) {
          const l = lRes.rows[0]
          const qrToken = crypto.randomBytes(24).toString('hex')
          const cardNum = `MBS-LEC-${String(l.id).padStart(5, '0')}`
          const identifier = `LEC-${String(l.id).padStart(4, '0')}`
          const ins = await pool.query(`
            INSERT INTO institutional_id_cards (
              card_number, cardholder_type, lecturer_id, cardholder_name,
              identifier_number, department_or_programme, role_title,
              qr_token, barcode_value, expires_at
            ) VALUES ($1, 'lecturer', $2, $3, $4, 'Faculty Academic Staff', 'Lecturer', $5, $6, NOW() + INTERVAL '2 years')
            RETURNING *
          `, [cardNum, l.id, `${l.first_name} ${l.last_name}`, identifier, qrToken, identifier])
          card = ins.rows[0]
        }
      }
    }

    if (!card) {
      return res.status(404).json({ success: false, message: 'Digital ID card not found for this account' })
    }

    res.json({ success: true, data: card })
  } catch (error) {
    console.error('Error fetching personal card:', error)
    res.status(500).json({ success: false, message: 'Failed to retrieve card' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PUBLIC & PRIVILEGED VERIFICATION BY TOKEN
// ─────────────────────────────────────────────────────────────────────────────
export const verifyCardByToken = async (req, res) => {
  try {
    const { token } = req.params
    const cardResult = await pool.query(`
      SELECT * FROM institutional_id_cards
      WHERE qr_token = $1
    `, [token])

    if (cardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Invalid or unregistered card verification token.'
      })
    }

    const card = cardResult.rows[0]
    const isExpired = card.expires_at && new Date(card.expires_at) < new Date()
    const isSuspended = card.status !== 'active'

    // Check verifier permissions
    const verifierCheck = await verifyScannerPermission(req)

    // Calculate clearance if cardholder is student
    let studentClearance = null
    if (card.student_id) {
      const invRes = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) AS total_invoiced
        FROM invoices WHERE student_id = $1
      `, [card.student_id])

      const payRes = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) AS total_paid
        FROM payments WHERE student_id = $1
      `, [card.student_id])

      const totalInvoiced = parseFloat(invRes.rows[0].total_invoiced || 0)
      const totalPaid = parseFloat(payRes.rows[0].total_paid || 0)
      const balance = Math.max(0, totalInvoiced - totalPaid)
      const percentPaid = totalInvoiced > 0 ? Math.min(100, Math.round((totalPaid / totalInvoiced) * 100)) : 100

      // Check exam PIN
      const pinRes = await pool.query(`
        SELECT pin, expires_at, used
        FROM student_exam_pins
        WHERE student_id = $1 AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
      `, [card.student_id])

      studentClearance = {
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        balance: balance,
        percentage_paid: percentPaid,
        is_fees_cleared: balance <= 0,
        exam_pass_eligible: balance <= 0,
        active_exam_pin: pinRes.rows[0]?.pin || null
      }
    }

    // Determine verification verdict
    let verificationResult = 'granted'
    if (isSuspended) verificationResult = `denied_${card.status}`
    else if (isExpired) verificationResult = 'denied_expired'

    // Log this scan
    await pool.query(`
      INSERT INTO id_verification_logs (
        card_id, card_number, qr_token, verifier_type, verifier_user_id,
        verifier_name, scan_location, verification_result, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      card.id,
      card.card_number,
      card.qr_token,
      verifierCheck.isAuthorized ? verifierCheck.verifierType : 'public',
      verifierCheck.isAuthorized ? verifierCheck.userId : null,
      verifierCheck.isAuthorized ? verifierCheck.verifierName : 'Public Web Gate',
      'Campus Gate / Verification Portal',
      verificationResult,
      req.ip || '127.0.0.1',
      req.headers['user-agent']?.substring(0, 255) || 'Web Browser'
    ])

    // Public view: Safe institutional authentication badge
    const publicCardData = {
      card_number: card.card_number,
      cardholder_name: card.cardholder_name,
      cardholder_type: card.cardholder_type,
      role_title: card.role_title,
      identifier_number: card.identifier_number,
      department_or_programme: card.department_or_programme,
      campus_name: card.campus_name,
      photo_url: card.photo_url,
      status: card.status,
      issued_at: card.issued_at,
      expires_at: card.expires_at,
      institution: 'Multitech Business School',
      is_valid: !isExpired && !isSuspended
    }

    if (!verifierCheck.isAuthorized) {
      return res.json({
        success: true,
        verified: true,
        is_authorized_verifier: false,
        card: publicCardData,
        message: isSuspended ? `Notice: This card is currently ${card.status}.` : isExpired ? 'Notice: This credential has expired.' : 'Official Multitech Business School Verified Credential'
      })
    }

    // Privileged verifier view: Full operational clearance
    res.json({
      success: true,
      verified: true,
      is_authorized_verifier: true,
      verifier: {
        name: verifierCheck.verifierName,
        type: verifierCheck.verifierType,
        email: verifierCheck.verifierEmail
      },
      card: {
        ...card,
        is_valid: !isExpired && !isSuspended
      },
      student_clearance: studentClearance,
      message: `Verified by authorized officer ${verifierCheck.verifierName}`
    })
  } catch (error) {
    console.error('Error verifying card:', error)
    res.status(500).json({ success: false, message: 'Verification lookup failed' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ADMIT STUDENT / ACTION LOGGING
// ─────────────────────────────────────────────────────────────────────────────
export const admitCardholder = async (req, res) => {
  try {
    const { token } = req.params
    const { action_type = 'admitted_exam', room_or_hall = 'Main Examination Hall', notes = '' } = req.body

    const verifierCheck = await verifyScannerPermission(req)
    if (!verifierCheck.isAuthorized) {
      return res.status(403).json({ success: false, message: 'Only authorized verifiers or administrators can admit cardholders.' })
    }

    const cardRes = await pool.query('SELECT * FROM institutional_id_cards WHERE qr_token = $1', [token])
    if (cardRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Card not found' })
    }

    const card = cardRes.rows[0]
    await pool.query(`
      INSERT INTO id_verification_logs (
        card_id, card_number, qr_token, verifier_type, verifier_user_id,
        verifier_name, scan_location, verification_result, action_taken, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'granted', $8, $9)
    `, [
      card.id,
      card.card_number,
      card.qr_token,
      verifierCheck.verifierType,
      verifierCheck.userId,
      verifierCheck.verifierName,
      room_or_hall,
      action_type,
      notes || `Admitted by ${verifierCheck.verifierName} to ${room_or_hall}`
    ])

    res.json({
      success: true,
      message: `Cardholder ${card.cardholder_name} successfully admitted.`,
      cardholder_name: card.cardholder_name,
      admitted_at: new Date().toISOString(),
      hall: room_or_hall
    })
  } catch (error) {
    console.error('Error admitting cardholder:', error)
    res.status(500).json({ success: false, message: 'Admittance recording failed' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. BATCH PRINT STATUS UPDATE
// ─────────────────────────────────────────────────────────────────────────────
export const batchPrintCards = async (req, res) => {
  try {
    const { card_ids } = req.body
    if (!Array.isArray(card_ids) || card_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'card_ids array is required' })
    }

    const batchId = `BATCH-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
    const adminId = req.admin?.id || null

    await pool.query(`
      UPDATE institutional_id_cards
      SET print_status = 'printed',
          printed_at = NOW(),
          printed_by = $1,
          batch_id = $2,
          updated_at = NOW()
      WHERE id = ANY($3::int[])
    `, [adminId, batchId, card_ids])

    res.json({
      success: true,
      batch_id: batchId,
      updated_count: card_ids.length,
      message: `Marked ${card_ids.length} card(s) as printed under batch ${batchId}.`
    })
  } catch (error) {
    console.error('Error updating print batch:', error)
    res.status(500).json({ success: false, message: 'Failed to process batch print update' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. UPDATE CARD STATUS (Suspend / Revoke / Active / Lost)
// ─────────────────────────────────────────────────────────────────────────────
export const updateCardStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const allowed = ['active', 'suspended', 'revoked', 'expired', 'lost']
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${allowed.join(', ')}` })
    }

    const result = await pool.query(`
      UPDATE institutional_id_cards
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Card not found' })
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `Card status updated to ${status}.`
    })
  } catch (error) {
    console.error('Error updating card status:', error)
    res.status(500).json({ success: false, message: 'Failed to update card status' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. VERIFIER DELEGATIONS (Grant / Revoke scanner privilege)
// ─────────────────────────────────────────────────────────────────────────────
export const getDelegations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, 
             u.username AS granted_by_username
      FROM id_verifier_delegations d
      LEFT JOIN admin_users u ON d.granted_by = u.id
      ORDER BY d.created_at DESC
    `)
    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Error fetching delegations:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch delegations' })
  }
}

export const createDelegation = async (req, res) => {
  try {
    const { account_email, account_name, user_type = 'staff', valid_until = null, purpose = 'Exam hall & facility verification' } = req.body

    if (!account_email || !account_name) {
      return res.status(400).json({ success: false, message: 'Account email and name are required' })
    }

    const adminId = req.admin?.id || null

    // Check if active delegation already exists
    const existing = await pool.query(`
      SELECT id FROM id_verifier_delegations
      WHERE LOWER(account_email) = LOWER($1) AND status = 'active'
    `, [account_email])

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'This account already holds an active verifier delegation.' })
    }

    const result = await pool.query(`
      INSERT INTO id_verifier_delegations (
        account_email, account_name, user_type, granted_by, valid_until, purpose, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING *
    `, [account_email.toLowerCase().trim(), account_name.trim(), user_type, adminId, valid_until || null, purpose])

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: `Verification privileges granted to ${account_name}.`
    })
  } catch (error) {
    console.error('Error creating delegation:', error)
    res.status(500).json({ success: false, message: 'Failed to create delegation' })
  }
}

export const revokeDelegation = async (req, res) => {
  try {
    const { id } = req.params
    const { reason = 'Revoked by administrator' } = req.body
    const adminId = req.admin?.id || null

    const result = await pool.query(`
      UPDATE id_verifier_delegations
      SET status = 'revoked',
          revoked_at = NOW(),
          revoked_by = $1,
          revocation_reason = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [adminId, reason, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Delegation record not found' })
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Delegation privilege revoked successfully.'
    })
  } catch (error) {
    console.error('Error revoking delegation:', error)
    res.status(500).json({ success: false, message: 'Failed to revoke delegation' })
  }
}

export const checkMyDelegationStatus = async (req, res) => {
  try {
    const status = await verifyScannerPermission(req)
    res.json({ success: true, ...status })
  } catch (error) {
    res.json({ success: true, isAuthorized: false })
  }
}
