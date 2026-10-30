import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import pool from '../config/database.js'
import crypto from 'crypto'

export const migrateIdCardsSchema = async () => {
  console.log('--- Starting ID Cards System Migration ---')

  // 1. Staff Members Table (Administrative & Support Staff)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff_members (
      id SERIAL PRIMARY KEY,
      employee_number VARCHAR(50) UNIQUE NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE,
      phone VARCHAR(50),
      role_type VARCHAR(30) NOT NULL CHECK (role_type IN ('administrative', 'support_staff')),
      department VARCHAR(150),
      job_title VARCHAR(150) NOT NULL,
      campus_name VARCHAR(100) DEFAULT 'Main Campus',
      photo_url TEXT,
      blood_group VARCHAR(10),
      emergency_contact VARCHAR(100),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
      admin_user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  console.log('✓ Verified staff_members table')

  // 2. Institutional ID Cards Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS institutional_id_cards (
      id SERIAL PRIMARY KEY,
      card_number VARCHAR(50) UNIQUE NOT NULL,
      cardholder_type VARCHAR(30) NOT NULL CHECK (cardholder_type IN ('student', 'lecturer', 'administrative', 'support_staff')),
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      lecturer_id INTEGER REFERENCES lecturers(id) ON DELETE CASCADE,
      admin_user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
      staff_member_id INTEGER REFERENCES staff_members(id) ON DELETE CASCADE,
      cardholder_name VARCHAR(150) NOT NULL,
      identifier_number VARCHAR(100) NOT NULL,
      department_or_programme VARCHAR(255),
      role_title VARCHAR(150) NOT NULL,
      campus_name VARCHAR(100) DEFAULT 'Main Campus',
      photo_url TEXT,
      qr_token TEXT UNIQUE NOT NULL,
      nfc_uid VARCHAR(64),
      barcode_value VARCHAR(100),
      blood_group VARCHAR(10),
      emergency_contact VARCHAR(100),
      status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked', 'expired', 'lost')),
      issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      print_status VARCHAR(30) DEFAULT 'queued' CHECK (print_status IN ('queued', 'printed', 'reprint_requested')),
      printed_at TIMESTAMP,
      printed_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
      batch_id VARCHAR(50),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  console.log('✓ Verified institutional_id_cards table')

  // 3. ID Verifier Delegations Table (Grant scanner privileges to staff or student)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS id_verifier_delegations (
      id SERIAL PRIMARY KEY,
      user_type VARCHAR(30) NOT NULL CHECK (user_type IN ('student', 'lecturer', 'admin', 'staff')),
      user_id INTEGER,
      account_email VARCHAR(150) NOT NULL,
      account_name VARCHAR(150) NOT NULL,
      granted_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
      valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      valid_until TIMESTAMP,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
      purpose VARCHAR(255) DEFAULT 'Exam hall entry & facility access verification',
      permissions JSONB DEFAULT '{"can_verify": true, "can_admit_exam": true, "can_view_financials": true}',
      revoked_at TIMESTAMP,
      revoked_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
      revocation_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  console.log('✓ Verified id_verifier_delegations table')

  // 4. ID Verification Logs Table (Scan audit trail)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS id_verification_logs (
      id SERIAL PRIMARY KEY,
      card_id INTEGER REFERENCES institutional_id_cards(id) ON DELETE CASCADE,
      card_number VARCHAR(50),
      qr_token VARCHAR(255),
      verifier_type VARCHAR(30),
      verifier_user_id INTEGER,
      verifier_name VARCHAR(150),
      scan_location VARCHAR(100) DEFAULT 'Gate / Exam Hall Entry',
      verification_result VARCHAR(50) NOT NULL,
      action_taken VARCHAR(50) DEFAULT 'viewed',
      notes TEXT,
      ip_address VARCHAR(50),
      user_agent TEXT,
      scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  console.log('✓ Verified id_verification_logs table')

  // Create Indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_id_cards_qr_token ON institutional_id_cards(qr_token)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_id_cards_cardholder_type ON institutional_id_cards(cardholder_type)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_id_cards_identifier ON institutional_id_cards(identifier_number)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_id_cards_print_status ON institutional_id_cards(print_status)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_verifier_delegations_email ON id_verifier_delegations(account_email)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_verifier_delegations_status ON id_verifier_delegations(status)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_verification_logs_card_id ON id_verification_logs(card_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_verification_logs_scanned_at ON id_verification_logs(scanned_at DESC)`)

  // Schema upgrades for existing tables
  await pool.query(`
    ALTER TABLE institutional_id_cards ALTER COLUMN qr_token TYPE TEXT;
    ALTER TABLE institutional_id_cards ADD COLUMN IF NOT EXISTS nfc_uid VARCHAR(64);
    ALTER TABLE id_verification_logs ALTER COLUMN qr_token TYPE TEXT;
  `)
  console.log('✓ Created indexes')

  // Seed sample staff members if empty
  const staffCheck = await pool.query('SELECT COUNT(*) as cnt FROM staff_members')
  if (parseInt(staffCheck.rows[0].cnt, 10) === 0) {
    console.log('Seeding initial administrative and support staff records...')
    const sampleStaff = [
      {
        employee_number: 'MBS-ADM-001',
        first_name: 'Dr. Evelyn',
        last_name: 'Kigozi',
        email: 'evelyn.kigozi@multitech.ac.ug',
        phone: '+256 772 100 201',
        role_type: 'administrative',
        department: 'Academic Registry',
        job_title: 'Academic Registrar',
        campus_name: 'Main Campus',
        blood_group: 'O+'
      },
      {
        employee_number: 'MBS-ADM-002',
        first_name: 'Patrick',
        last_name: 'Kavuma',
        email: 'patrick.kavuma@multitech.ac.ug',
        phone: '+256 701 543 210',
        role_type: 'administrative',
        department: 'ICT & Systems',
        job_title: 'Senior Systems Administrator',
        campus_name: 'Main Campus',
        blood_group: 'A+'
      },
      {
        employee_number: 'MBS-SUP-001',
        first_name: 'Sarah',
        last_name: 'Namubiru',
        email: 'sarah.namubiru@multitech.ac.ug',
        phone: '+256 782 345 678',
        role_type: 'support_staff',
        department: 'Library Services',
        job_title: 'Head Library Operations Officer',
        campus_name: 'Main Campus',
        blood_group: 'B+'
      },
      {
        employee_number: 'MBS-SUP-002',
        first_name: 'Ronald',
        last_name: 'Otim',
        email: 'ronald.otim@multitech.ac.ug',
        phone: '+256 752 987 654',
        role_type: 'support_staff',
        department: 'Campus Security & Safety',
        job_title: 'Chief Security Officer',
        campus_name: 'Main Campus',
        blood_group: 'AB+'
      }
    ]

    for (const s of sampleStaff) {
      await pool.query(`
        INSERT INTO staff_members (
          employee_number, first_name, last_name, email, phone, role_type,
          department, job_title, campus_name, blood_group
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (employee_number) DO NOTHING
      `, [
        s.employee_number, s.first_name, s.last_name, s.email, s.phone,
        s.role_type, s.department, s.job_title, s.campus_name, s.blood_group
      ])
    }
    console.log('✓ Seeded initial staff members')
  }

  console.log('--- ID Cards System Migration Finished Successfully ---')
}

// Direct script execution
if (process.argv[1]?.endsWith('migrateIdCards.js')) {
  migrateIdCardsSchema()
    .then(() => {
      console.log('Migration completed successfully')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Migration failed:', err)
      process.exit(1)
    })
}
