/**
 * Migration: Full Application System Schema
 * - Expands programmes table
 * - Creates functional_fees, programme_fees, applications, student_accounts tables
 */

import pool from '../config/database.js'

const migrate = async () => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    console.log('📦 Expanding programmes table...')
    await client.query(`
      ALTER TABLE programmes
        ADD COLUMN IF NOT EXISTS requirements TEXT,
        ADD COLUMN IF NOT EXISTS curriculum JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS career_prospects TEXT,
        ADD COLUMN IF NOT EXISTS intake_status VARCHAR(20) DEFAULT 'closed',
        ADD COLUMN IF NOT EXISTS application_start_date DATE,
        ADD COLUMN IF NOT EXISTS application_end_date DATE,
        ADD COLUMN IF NOT EXISTS is_supplementary BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS local_tuition_fee NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS international_tuition_fee NUMERIC(12,2)
    `)

    console.log('📦 Creating functional_fees table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS functional_fees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        applies_to VARCHAR(20) DEFAULT 'all' CHECK (applies_to IN ('all', 'local', 'international')),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    console.log('📦 Creating programme_fees table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS programme_fees (
        id SERIAL PRIMARY KEY,
        programme_id INT NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
        fee_name VARCHAR(255) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    console.log('📦 Rebuilding applications table...')
    // Drop old table (it was a basic stub) and recreate with full schema
    await client.query(`DROP TABLE IF EXISTS applications CASCADE`)
    await client.query(`
      CREATE TABLE applications (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(30) UNIQUE NOT NULL,
        programme_id INT REFERENCES programmes(id) ON DELETE SET NULL,

        -- Personal Info
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        last_name VARCHAR(100) NOT NULL,
        gender VARCHAR(20),
        date_of_birth DATE,
        marital_status VARCHAR(30),
        nationality VARCHAR(100),
        country_of_residence VARCHAR(100),
        id_number VARCHAR(100),
        religion VARCHAR(100),
        disability_disclosed BOOLEAN DEFAULT false,
        disability_details TEXT,
        funding_source VARCHAR(100),

        -- Contact
        phone VARCHAR(30),
        email VARCHAR(255),
        address TEXT,
        town VARCHAR(100),
        county VARCHAR(100),

        -- Next of Kin
        kin_name VARCHAR(200),
        kin_relationship VARCHAR(100),
        kin_phone VARCHAR(30),
        kin_email VARCHAR(255),
        kin_address TEXT,

        -- Academic background stored as JSON array
        academic_history JSONB DEFAULT '[]',

        -- Google Drive folder IDs
        drive_folder_id VARCHAR(255),
        passport_photo_folder_id VARCHAR(255),
        identity_docs_folder_id VARCHAR(255),
        academic_docs_folder_id VARCHAR(255),

        -- Uploaded file references (url + drive_id per file)
        passport_photo_url VARCHAR(500),
        passport_photo_drive_id VARCHAR(255),
        documents JSONB DEFAULT '[]',

        -- Status
        status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'admitted', 'rejected')),
        admin_notes TEXT,

        applied_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    console.log('📦 Creating student_accounts table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_accounts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        application_id INT REFERENCES applications(id) ON DELETE CASCADE,
        must_change_password BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    await client.query('COMMIT')
    console.log('✅ Migration complete!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed, rolled back:', err.message)
    process.exit(1)
  } finally {
    client.release()
    process.exit(0)
  }
}

migrate()
