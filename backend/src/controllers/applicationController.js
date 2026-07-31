import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'
import { createApplicationFolders, uploadToFolder, deleteFromDrive } from '../utils/googleDriveService.js'
import { getSetting } from '../utils/settingsService.js'
import { queueEmailDispatch } from '../services/emailDispatcher.js'
import { renderApplicationAcknowledgementEmail } from '../utils/emailTemplates.js'
import { generateApplicationAcknowledgementPdf } from '../utils/pdfService.js'
import bcrypt from 'bcryptjs'

/**
 * Generate Application ID: MBS-YYYYMMDD-NNN
 * Thread-safe: uses COUNT of today's applications already in DB
 */
const generateReferenceNumber = async (client) => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '') // '20260623'
  const { rows } = await client.query(
    `SELECT COUNT(*) FROM applications WHERE applied_at::date = CURRENT_DATE`
  )
  const sequence = String(parseInt(rows[0].count) + 1).padStart(3, '0')
  return `MBS-${today}-${sequence}`
}

// Get all applications (admin)
export const getApplications = asyncHandler(async (req, res) => {
  const { status, intake_id, search } = req.query

  let query = `
    SELECT a.*, i.name AS intake_name,
      (SELECT json_agg(json_build_object(
         'id', ac.id,
         'programme_intake_id', ac.programme_intake_id,
         'preference_order', ac.preference_order,
         'status', ac.status,
         'programme_name', p.name
       ) ORDER BY ac.preference_order)
       FROM application_choices ac
       JOIN programme_intakes pi ON ac.programme_intake_id = pi.id
       JOIN programmes p ON pi.programme_id = p.id
       WHERE ac.application_id = a.id
      ) AS choices
    FROM applications a
    LEFT JOIN intakes i ON a.intake_id = i.id
    WHERE 1=1
  `
  const params = []
  let idx = 1

  if (status) { query += ` AND a.status = $${idx++}`; params.push(status) }
  if (intake_id) { query += ` AND a.intake_id = $${idx++}`; params.push(intake_id) }
  if (search) {
    query += ` AND (a.first_name ILIKE $${idx} OR a.last_name ILIKE $${idx} OR a.email ILIKE $${idx} OR a.reference_number ILIKE $${idx})`
    params.push(`%${search}%`); idx++
  }

  query += ' ORDER BY a.applied_at DESC'

  const result = await pool.query(query, params)
  res.json({ success: true, data: result.rows })
})

// Get single application by ID or reference_number
export const getApplicationById = asyncHandler(async (req, res) => {
  const { id } = req.params
  const result = await pool.query(
    `SELECT a.*, i.name AS intake_name,
      (SELECT json_agg(json_build_object(
         'id', ac.id,
         'programme_intake_id', ac.programme_intake_id,
         'preference_order', ac.preference_order,
         'status', ac.status,
         'programme_name', p.name
       ) ORDER BY ac.preference_order)
       FROM application_choices ac
       JOIN programme_intakes pi ON ac.programme_intake_id = pi.id
       JOIN programmes p ON pi.programme_id = p.id
       WHERE ac.application_id = a.id
      ) AS choices
     FROM applications a
     LEFT JOIN intakes i ON a.intake_id = i.id
     WHERE a.id = $1 OR a.reference_number = $1`,
    [id]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Application not found' })
  }
  res.json({ success: true, data: result.rows[0] })
})

// Submit application (public)
export const createApplication = asyncHandler(async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const {
      intake_id, choices,
      first_name, middle_name, last_name,
      gender, date_of_birth, marital_status,
      nationality, country_of_residence, id_number,
      religion, disability_disclosed, disability_details,
      funding_source,
      phone, email, address, town, county,
      kin_name, kin_relationship, kin_phone, kin_email, kin_address,
      academic_history
    } = req.body

    // --- Validate required fields ---
    const missing = ['intake_id', 'first_name', 'last_name', 'email', 'phone']
      .filter(f => !req.body[f])
    if (missing.length) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` })
    }

    // --- Validate email format ---
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Invalid email format' })
    }

    // --- Parse choices ---
    let parsedChoices = []
    try {
      parsedChoices = typeof choices === 'string' ? JSON.parse(choices) : (choices || [])
    } catch {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Invalid choices format' })
    }
    if (!parsedChoices.length) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'At least one programme choice is required' })
    }

    // --- Validate intake is open ---
    const intakeRes = await client.query('SELECT * FROM intakes WHERE id = $1', [intake_id])
    if (intakeRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Intake not found' })
    }
    const intake = intakeRes.rows[0]
    const now = new Date()
    const startDate = intake.application_start_date ? new Date(intake.application_start_date) : null
    const endDate = intake.application_end_date ? new Date(intake.application_end_date) : null
    const isOpen = intake.status === 'open' || intake.status === 'active'
    const inWindow = (!startDate || now >= startDate) && (!endDate || now <= endDate)
    if (!isOpen || !inWindow) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'This intake is not currently accepting applications' })
    }

    // --- Validate each programme_intake_id belongs to this intake ---
    const choiceRows = []
    for (const choice of parsedChoices) {
      const piRes = await client.query(
        `SELECT pi.id, p.name as programme_name
         FROM programme_intakes pi
         JOIN programmes p ON p.id = pi.programme_id
         WHERE pi.id = $1 AND pi.intake_id = $2 AND p.active = true`,
        [choice.programme_intake_id, intake_id]
      )
      if (piRes.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ success: false, message: `Programme choice ${choice.preference_order} is not available for this intake` })
      }
      choiceRows.push({ programme_intake_id: choice.programme_intake_id, preference_order: choice.preference_order, ...piRes.rows[0] })
    }

    // --- Single enrolment: block duplicate for same intake ---
    const existingApp = await client.query(
      `SELECT id FROM applications WHERE email = $1 AND intake_id = $2 AND status NOT IN ('rejected')`,
      [email, intake_id]
    )
    if (existingApp.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'You already have an active application for this intake.' })
    }

    // --- Generate Application reference ---
    const referenceNumber = await generateReferenceNumber(client)

    // --- Create Google Drive folder hierarchy ---
    let folderIds = { drive_folder_id: null, passport_photo_folder_id: null, identity_docs_folder_id: null, academic_docs_folder_id: null }
    try {
      folderIds = await createApplicationFolders(referenceNumber)
    } catch (driveErr) {
      console.error('Drive folder creation failed (non-blocking):', driveErr.message)
    }

    // --- Insert application record ---
    const appResult = await client.query(`
      INSERT INTO applications (
        reference_number, intake_id,
        first_name, middle_name, last_name, gender, date_of_birth, marital_status,
        nationality, country_of_residence, id_number, religion,
        disability_disclosed, disability_details, funding_source,
        phone, email, address, town, county,
        kin_name, kin_relationship, kin_phone, kin_email, kin_address,
        academic_history,
        drive_folder_id, passport_photo_folder_id, identity_docs_folder_id, academic_docs_folder_id,
        status, payment_status, applied_at
      ) VALUES (
        $1, $2,
        $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26,
        $27, $28, $29, $30,
        'pending', 'pending', NOW()
      ) RETURNING *`,
      [
        referenceNumber, intake_id,
        first_name, middle_name || null, last_name, gender, date_of_birth, marital_status,
        nationality, country_of_residence, id_number, religion,
        disability_disclosed === 'true' || disability_disclosed === true,
        disability_details || null,
        funding_source,
        phone, email, address, town, county,
        kin_name, kin_relationship, kin_phone, kin_email || null, kin_address,
        JSON.stringify(academic_history ? (typeof academic_history === 'string' ? JSON.parse(academic_history) : academic_history) : []),
        folderIds.drive_folder_id,
        folderIds.passport_photo_folder_id,
        folderIds.identity_docs_folder_id,
        folderIds.academic_docs_folder_id
      ]
    )
    const application = appResult.rows[0]

    // --- Insert application choices ---
    for (const choice of choiceRows) {
      await client.query(
        `INSERT INTO application_choices (application_id, programme_intake_id, preference_order, status)
         VALUES ($1, $2, $3, 'pending')`,
        [application.id, choice.programme_intake_id, choice.preference_order]
      )
    }

    // --- Upload files to Drive subfolders ---
    const documents = []
    const files = req.files || {}

    if (files.passport_photo && files.passport_photo[0] && folderIds.passport_photo_folder_id) {
      const uploaded = await uploadToFolder(files.passport_photo[0], folderIds.passport_photo_folder_id)
      await client.query(
        'UPDATE applications SET passport_photo_url = $1, passport_photo_drive_id = $2 WHERE id = $3',
        [uploaded.url, uploaded.fileId, application.id]
      )
    }

    const docTypes = [
      { field: 'national_id', type: 'National ID / Passport', folder: folderIds.identity_docs_folder_id },
      { field: 'academic_docs', type: 'Academic Documents', folder: folderIds.academic_docs_folder_id }
    ]
    for (const docType of docTypes) {
      const fileList = files[docType.field] || []
      for (const f of fileList) {
        if (f && docType.folder) {
          const uploaded = await uploadToFolder(f, docType.folder)
          documents.push({ type: docType.type, name: f.originalname, url: uploaded.url, drive_id: uploaded.fileId, web_view_link: uploaded.webViewLink })
        }
      }
    }
    if (documents.length > 0) {
      await client.query('UPDATE applications SET documents = $1 WHERE id = $2', [JSON.stringify(documents), application.id])
    }

    // --- Auto-create student account ---
    const passwordHash = await bcrypt.hash(referenceNumber, 12)
    await client.query(
      `INSERT INTO student_accounts (email, password_hash, application_id, must_change_password, created_at)
       VALUES ($1, $2, $3, true, NOW()) ON CONFLICT (email) DO NOTHING`,
      [email, passwordHash, application.id]
    )

    await client.query('COMMIT')

    // --- Send acknowledgement email ---
    const choicesList = choiceRows.map((c, i) => `${i + 1}. ${c.programme_name}`).join('\n')
    const acknowledgementTemplate = await getSetting('application_acknowledgement_template')
    const acknowledgementEmail = renderApplicationAcknowledgementEmail({
      template: acknowledgementTemplate,
      name: `${first_name} ${last_name}`,
      applicationReference: referenceNumber,
      intakeName: intake.name,
      applicationFee: intake.application_fee,
      choicesList,
      status: 'pending',
      loginEmail: email,
      loginPassword: referenceNumber,
      applicationDate: new Date().toLocaleDateString(),
      email,
      phone
    })

    try {
      const receiptBuffer = await generateApplicationAcknowledgementPdf({
        referenceNumber,
        fullName: `${first_name} ${last_name}`,
        programmeName: `Intake: ${intake.name} | Choices: ${choiceRows.map(c => c.programme_name).join(', ')}`,
        applicationDate: new Date().toLocaleDateString(),
        email, phone,
        loginEmail: email,
        loginPassword: referenceNumber,
        status: 'pending'
      })
      queueEmailDispatch({
        to: email,
        subject: acknowledgementEmail.subject,
        text: acknowledgementEmail.text,
        html: acknowledgementEmail.html,
        attachments: [{
          filename: `${referenceNumber}-acknowledgement.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
          content: receiptBuffer.toString('base64')
        }]
      })
    } catch (emailError) {
      console.error('Application acknowledgement email failed:', emailError.message || emailError)
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        reference_number: referenceNumber,
        applicant_name: `${first_name} ${last_name}`,
        intake: intake.name,
        payment_status: 'pending',
        status: 'pending',
        credentials: {
          email,
          password: referenceNumber,
          note: 'These are your default login credentials. Please save them securely. You will be prompted to change your password on first login.'
        }
      }
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Application submission error:', err)
    throw err
  } finally {
    client.release()
  }
})

// Update Payment Status (admin)
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { payment_status } = req.body

  if (!['pending', 'paid'].includes(payment_status)) {
    return res.status(400).json({ success: false, message: 'Invalid payment status' })
  }

  const result = await pool.query(
    'UPDATE applications SET payment_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [payment_status, id]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Application not found' })
  }
  res.json({ success: true, data: result.rows[0] })
})

// Send Payment Reminder (admin)
export const sendPaymentReminder = asyncHandler(async (req, res) => {
  const { id } = req.params
  const appRes = await pool.query(
    `SELECT a.*, i.name as intake_name, i.application_fee
     FROM applications a
     JOIN intakes i ON a.intake_id = i.id
     WHERE a.id = $1`,
    [id]
  )
  if (appRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Application not found' })
  }
  const app = appRes.rows[0]
  if (app.payment_status === 'paid') {
    return res.status(400).json({ success: false, message: 'Application fee is already paid.' })
  }

  const emailHtml = `
    <p>Dear ${app.first_name},</p>
    <p>This is a reminder to pay the application fee of <strong>KES ${app.application_fee}</strong> for the <strong>${app.intake_name}</strong> intake.</p>
    <p>Your application (Ref: <strong>${app.reference_number}</strong>) cannot be reviewed until payment is received.</p>
    <p>Please refer to the instructions in your original application confirmation email for payment details.</p>
    <p>Thank you,<br/>Multitech Business School Admissions</p>
  `

  queueEmailDispatch({
    to: app.email,
    subject: 'Application Fee Payment Reminder - Multitech Business School',
    text: `Dear ${app.first_name}, please pay your application fee of KES ${app.application_fee} for Ref: ${app.reference_number}.`,
    html: emailHtml
  })
  res.json({ success: true, message: 'Payment reminder sent successfully.' })
})

// Evaluate Application Choice (admin, payment-gated, cascading)
export const evaluateApplicationChoice = asyncHandler(async (req, res) => {
  const { id, choice_id } = req.params
  const { status, reviewer_notes } = req.body

  if (!['offered', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status. Must be offered or rejected.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Block review if unpaid
    const appRes = await client.query('SELECT payment_status FROM applications WHERE id = $1', [id])
    if (appRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Application not found' })
    }
    if (appRes.rows[0].payment_status !== 'paid') {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Cannot review application until application fee is paid.' })
    }

    const choiceRes = await client.query(
      `UPDATE application_choices
       SET status = $1, reviewer_notes = $2, updated_at = NOW()
       WHERE id = $3 AND application_id = $4 RETURNING *`,
      [status, reviewer_notes || null, choice_id, id]
    )
    if (choiceRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Choice not found for this application' })
    }
    const currentChoice = choiceRes.rows[0]

    if (status === 'offered') {
      // Bypass all lower preferences
      await client.query(
        `UPDATE application_choices
         SET status = 'bypassed', updated_at = NOW()
         WHERE application_id = $1 AND preference_order > $2 AND status = 'pending'`,
        [id, currentChoice.preference_order]
      )
      // Update application overall status to offered
      await client.query(
        `UPDATE applications SET status = 'offered', updated_at = NOW() WHERE id = $1`,
        [id]
      )
    } else if (status === 'rejected') {
      // If all choices are now terminal, mark application as rejected
      const remaining = await client.query(
        `SELECT id FROM application_choices WHERE application_id = $1 AND status IN ('pending', 'offered')`,
        [id]
      )
      if (remaining.rows.length === 0) {
        await client.query(`UPDATE applications SET status = 'rejected', updated_at = NOW() WHERE id = $1`, [id])
      }
    }

    await client.query('COMMIT')
    res.json({ success: true, message: `Choice ${status} successfully.` })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// Delete application (admin)
export const deleteApplication = asyncHandler(async (req, res) => {
  const { id } = req.params
  const existing = await pool.query('SELECT * FROM applications WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Application not found' })
  }
  const app = existing.rows[0]

  // Clean up Drive files if any
  if (app.passport_photo_drive_id) {
    await deleteFromDrive(app.passport_photo_drive_id)
  }
  if (app.documents) {
    const docs = typeof app.documents === 'string' ? JSON.parse(app.documents) : app.documents
    for (const doc of docs) {
      if (doc.drive_id) await deleteFromDrive(doc.drive_id)
    }
  }

  await pool.query('DELETE FROM applications WHERE id = $1', [id])
  res.json({ success: true, message: 'Application deleted' })
})
