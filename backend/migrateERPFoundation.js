import pool from './src/config/database.js'

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('Starting ERP Foundation Migration...')
    await client.query('BEGIN')

    // 1. Academic Years
    await client.query(`
      CREATE TABLE IF NOT EXISTS academic_years (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL, -- e.g., "2026/2027"
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, active, completed
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created academic_years table.')

    // 2. Academic Terms
    await client.query(`
      CREATE TABLE IF NOT EXISTS academic_terms (
        id SERIAL PRIMARY KEY,
        academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL, -- e.g., "Semester 1"
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created academic_terms table.')

    // 3. Students (Master record)
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        student_account_id INTEGER REFERENCES student_accounts(id) ON DELETE CASCADE,
        application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
        student_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., 26/U/1234/PS
        programme_id INTEGER REFERENCES programmes(id) ON DELETE RESTRICT,
        intake_term_id INTEGER REFERENCES academic_terms(id) ON DELETE RESTRICT,
        current_status VARCHAR(20) DEFAULT 'active', -- active, suspended, deferred, graduated, dismissed
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created students table.')

    // 4. Student Term Enrollments (The JIT Ledger)
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_term_enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        academic_term_id INTEGER REFERENCES academic_terms(id) ON DELETE RESTRICT,
        study_year INTEGER NOT NULL, -- e.g., 1, 2, 3
        study_semester INTEGER NOT NULL, -- e.g., 1, 2
        progression_status VARCHAR(20) DEFAULT 'normal', -- normal, retake, dead_semester, completed
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, academic_term_id)
      )
    `)
    console.log('Created student_term_enrollments table.')

    // 5. Courses (Module Catalog)
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        programme_id INTEGER REFERENCES programmes(id) ON DELETE CASCADE,
        course_code VARCHAR(20) NOT NULL,
        name VARCHAR(150) NOT NULL,
        credits INTEGER DEFAULT 3,
        target_year INTEGER NOT NULL,
        target_semester INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created courses table.')

    // 6. Course Registrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_registrations (
        id SERIAL PRIMARY KEY,
        student_term_enrollment_id INTEGER REFERENCES student_term_enrollments(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE RESTRICT,
        type VARCHAR(20) DEFAULT 'first_attempt', -- first_attempt, retake
        status VARCHAR(20) DEFAULT 'registered', -- registered, dropped, withdrawn
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_term_enrollment_id, course_id)
      )
    `)
    console.log('Created course_registrations table.')

    // 7. Grades
    await client.query(`
      CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        course_registration_id INTEGER REFERENCES course_registrations(id) ON DELETE CASCADE UNIQUE,
        coursework_mark NUMERIC(5,2),
        exam_mark NUMERIC(5,2),
        final_score NUMERIC(5,2),
        grade_letter VARCHAR(5),
        grade_points NUMERIC(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created grades table.')

    // 8. Invoices
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        academic_term_id INTEGER REFERENCES academic_terms(id) ON DELETE RESTRICT,
        amount NUMERIC(15,2) NOT NULL,
        currency VARCHAR(5) DEFAULT 'UGX',
        fee_type VARCHAR(50) NOT NULL, -- tuition, functional, late_registration
        description TEXT,
        due_date DATE,
        status VARCHAR(20) DEFAULT 'unpaid', -- unpaid, partial, paid, void
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created invoices table.')

    // 9. Payments
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        amount NUMERIC(15,2) NOT NULL,
        currency VARCHAR(5) DEFAULT 'UGX',
        payment_method VARCHAR(50), -- bank_transfer, mobile_money, cash
        reference_code VARCHAR(100) UNIQUE,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created payments table.')

    // 10. Invoice Payments (Junction)
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
        amount_applied NUMERIC(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created invoice_payments table.')

    // 11. ERP Exams (Synced from Exam Portal)
    await client.query(`
      CREATE TABLE IF NOT EXISTS erp_exams (
        id SERIAL PRIMARY KEY,
        exam_portal_id VARCHAR(100) UNIQUE NOT NULL,
        erp_course_code VARCHAR(50) NOT NULL,
        exam_title VARCHAR(200) NOT NULL,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        duration_minutes INTEGER,
        seb_file_base64 TEXT,
        seb_config_key TEXT,
        gate_url TEXT,
        allow_file_upload BOOLEAN DEFAULT false,
        permitted_apps JSONB DEFAULT '[]',
        seb_settings JSONB DEFAULT '{}',
        assessment_type VARCHAR(50) DEFAULT 'final_exam',
        weight_percentage NUMERIC(5,2) DEFAULT 60.00,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query(`
      ALTER TABLE erp_exams 
        ADD COLUMN IF NOT EXISTS allow_file_upload BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS permitted_apps JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS seb_settings JSONB NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50) NOT NULL DEFAULT 'final_exam',
        ADD COLUMN IF NOT EXISTS weight_percentage NUMERIC(5,2) NOT NULL DEFAULT 60.00;
    `)
    console.log('Created erp_exams table.')

    // 12. Student Exam PINs (One-Time Authentication)
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_exam_pins (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        pin VARCHAR(10) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created student_exam_pins table.')

    await client.query('COMMIT')
    console.log('Migration successful!')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Migration failed:', err)
  } finally {
    client.release()
    process.exit(0)
  }
}

migrate()
