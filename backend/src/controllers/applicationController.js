import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'
import { createApplicationFolders, uploadToFolder, deleteFromDrive } from '../utils/googleDriveService.js'
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
  const { status, programme_id, search } = req.query

  let query = `
    SELECT a.*, p.name AS programme_name
    FROM applications a
    LEFT JOIN programmes p ON a.programme_id = p.id
    WHERE 1=1
  `
  const params = []
  let idx = 1

  if (status) { query += ` AND a.status = $${idx++}`; params.push(status) }
  if (programme_id) { query += ` AND a.programme_id = $${idx++}`; params.push(programme_id) }
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
    `SELECT a.*, p.name AS programme_name FROM applications a 
     LEFT JOIN programmes p ON a.programme_id = p.id
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
      programme_id,
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
    const missing = ['programme_id', 'first_name', 'last_name', 'email', 'phone']
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

    // --- Check intake is open ---
    const prog = await client.query(
      `SELECT id, name, intake_status, application_start_date, application_end_date, is_supplementary
       FROM programmes WHERE id = $1 AND active = true`,
      [programme_id]
    )
    if (prog.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Programme not found' })
    }
    const programme = prog.rows[0]
    const now = new Date()
    const isOpen = programme.intake_status === 'open' ||
      (programme.application_start_date && programme.application_end_date &&
        now >= new Date(programme.application_start_date) &&
        now <= new Date(programme.application_end_date))

    if (!isOpen) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'This programme is not currently accepting applications' })
    }

    // --- Single enrolment validation ---
    const existingApp = await client.query(
      `SELECT a.id, p.is_supplementary AS applied_prog_supplementary
       FROM applications a
       JOIN programmes p ON a.programme_id = p.id
       WHERE a.email = $1 AND a.status NOT IN ('rejected')`,
      [email]
    )
    if (existingApp.rows.length > 0 && !programme.is_supplementary) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        message: 'You already have an active application. Only supplementary short courses can be added alongside a main programme.'
      })
    }

    // --- Generate Application ID ---
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
        reference_number, programme_id,
        first_name, middle_name, last_name, gender, date_of_birth, marital_status,
        nationality, country_of_residence, id_number, religion,
        disability_disclosed, disability_details, funding_source,
        phone, email, address, town, county,
        kin_name, kin_relationship, kin_phone, kin_email, kin_address,
        academic_history,
        drive_folder_id, passport_photo_folder_id, identity_docs_folder_id, academic_docs_folder_id,
        status, applied_at
      ) VALUES (
        $1, $2,
        $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26,
        $27, $28, $29, $30,
        'pending', NOW()
      ) RETURNING *`,
      [
        referenceNumber, programme_id,
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

    // --- Upload files to their respective Drive subfolders ---
    const documents = []
    const files = req.files || {}

    if (files.passport_photo && files.passport_photo[0] && folderIds.passport_photo_folder_id) {
      const uploaded = await uploadToFolder(files.passport_photo[0], folderIds.passport_photo_folder_id)
      await client.query(
        `UPDATE applications SET passport_photo_url = $1, passport_photo_drive_id = $2 WHERE id = $3`,
        [uploaded.url, uploaded.fileId, application.id]
      )
      application.passport_photo_url = uploaded.url
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
      await client.query(`UPDATE applications SET documents = $1 WHERE id = $2`, [JSON.stringify(documents), application.id])
    }

    // --- Auto-create student account ---
    const passwordHash = await bcrypt.hash(referenceNumber, 12)
    await client.query(`
      INSERT INTO student_accounts (email, password_hash, application_id, must_change_password, created_at)
      VALUES ($1, $2, $3, true, NOW())
      ON CONFLICT (email) DO NOTHING`,
      [email, passwordHash, application.id]
    )

    await client.query('COMMIT')

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        reference_number: referenceNumber,
        applicant_name: `${first_name} ${last_name}`,
        programme: programme.name,
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

// Update application status (admin)
export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status, admin_notes } = req.body

  const validStatuses = ['pending', 'reviewing', 'admitted', 'rejected']
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' })
  }

  const result = await pool.query(
    `UPDATE applications SET status = $1, admin_notes = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [status, admin_notes || null, id]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Application not found' })
  }
  res.json({ success: true, data: result.rows[0] })
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
