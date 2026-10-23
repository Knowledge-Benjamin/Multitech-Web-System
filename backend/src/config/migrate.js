import pool from '../config/database.js'

const ensureProgrammeColumns = async () => {
  const columnDefinitions = [
    ['slug', "VARCHAR(255)"],
    ['requirements', 'TEXT'],
    ['curriculum', 'TEXT'],
    ['career_prospects', 'TEXT'],
    ['intake_status', "VARCHAR(50) DEFAULT 'closed'"],
    ['application_start_date', 'DATE'],
    ['application_end_date', 'DATE'],
    ['is_supplementary', 'BOOLEAN DEFAULT false'],
    ['national_tuition_fee', 'DECIMAL(10, 2)'],
    ['international_tuition_fee', 'DECIMAL(10, 2)'],
    ['image_url', 'TEXT'],
    ['gdrive_file_id', 'TEXT']
  ]

  for (const [columnName, definition] of columnDefinitions) {
    await pool.query(`ALTER TABLE programmes ADD COLUMN IF NOT EXISTS ${columnName} ${definition}`)
  }

  await pool.query(`
    UPDATE programmes
    SET slug = COALESCE(NULLIF(trim(slug), ''), lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')))
    WHERE slug IS NULL OR trim(slug) = ''
  `)
}

const ensureTableColumns = async (tableName, columnDefinitions) => {
  for (const [columnName, definition] of columnDefinitions) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${definition}`)
  }
}

const initializeDatabase = async () => {
  try {
    console.log('Initializing database schema...')

    // Programmes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS programmes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK(type IN ('undergraduate', 'postgraduate', 'diploma', 'professional')),
        level VARCHAR(50) NOT NULL DEFAULT 'undergraduate',
        description TEXT NOT NULL,
        duration VARCHAR(50) NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 50,
        tuition_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        active BOOLEAN DEFAULT true,
        image_url TEXT,
        gdrive_file_id TEXT,
        requirements TEXT,
        curriculum TEXT,
        career_prospects TEXT,
        intake_status VARCHAR(50) DEFAULT 'closed',
        application_start_date DATE,
        application_end_date DATE,
        is_supplementary BOOLEAN DEFAULT false,
        national_tuition_fee DECIMAL(10, 2),
        international_tuition_fee DECIMAL(10, 2),
        slug VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await ensureProgrammeColumns()

    // Academic Structure & Campuses
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faculties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        description TEXT,
        dean_name VARCHAR(255),
        featured_image_url TEXT,
        file_id TEXT,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        faculty_id INTEGER REFERENCES faculties(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        description TEXT,
        hod_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campuses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        tagline VARCHAR(255),
        description TEXT,
        address TEXT,
        city VARCHAR(100),
        phone VARCHAR(50),
        email VARCHAR(255),
        map_embed_url TEXT,
        featured_image_url TEXT,
        file_id TEXT,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Link departments to programmes
    await ensureTableColumns('programmes', [
      ['department_id', 'INTEGER REFERENCES departments(id) ON DELETE SET NULL']
    ])

    // Campus-Programme Junction
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campus_programmes (
        campus_id INTEGER REFERENCES campuses(id) ON DELETE CASCADE,
        programme_id INTEGER REFERENCES programmes(id) ON DELETE CASCADE,
        PRIMARY KEY (campus_id, programme_id)
      )
    `)

    // Intakes and application workflow tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS intakes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        academic_year VARCHAR(50),
        application_fee NUMERIC(10, 2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'upcoming',
        application_start_date DATE,
        application_end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await ensureTableColumns('intakes', [
      ['application_fee', 'NUMERIC(10, 2) DEFAULT 0.00'],
      ['status', "VARCHAR(20) DEFAULT 'upcoming'"],
      ['application_start_date', 'DATE'],
      ['application_end_date', 'DATE']
    ])

    await pool.query(`
      CREATE TABLE IF NOT EXISTS programme_intakes (
        id SERIAL PRIMARY KEY,
        intake_id INTEGER REFERENCES intakes(id) ON DELETE CASCADE,
        programme_id INTEGER REFERENCES programmes(id) ON DELETE CASCADE,
        application_start_date DATE,
        application_end_date DATE,
        intake_status VARCHAR(20) DEFAULT 'closed',
        quota INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Applications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(30),
        intake_id INTEGER REFERENCES intakes(id) ON DELETE SET NULL,
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
        phone VARCHAR(30) NOT NULL,
        email VARCHAR(255) NOT NULL,
        address TEXT,
        town VARCHAR(100),
        county VARCHAR(100),
        kin_name VARCHAR(200),
        kin_relationship VARCHAR(100),
        kin_phone VARCHAR(30),
        kin_email VARCHAR(255),
        kin_address TEXT,
        academic_history JSONB DEFAULT '[]',
        drive_folder_id VARCHAR(255),
        passport_photo_folder_id VARCHAR(255),
        identity_docs_folder_id VARCHAR(255),
        academic_docs_folder_id VARCHAR(255),
        passport_photo_url VARCHAR(500),
        passport_photo_drive_id VARCHAR(255),
        documents JSONB DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'pending' CHECK(status IN ('pending', 'submitted', 'under_review', 'accepted', 'rejected', 'offered', 'reviewing', 'admitted')),
        payment_status VARCHAR(20) DEFAULT 'pending',
        admin_notes TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await ensureTableColumns('applications', [
      ['reference_number', 'VARCHAR(30)'],
      ['intake_id', 'INTEGER REFERENCES intakes(id) ON DELETE SET NULL'],
      ['middle_name', 'VARCHAR(100)'],
      ['gender', 'VARCHAR(20)'],
      ['date_of_birth', 'DATE'],
      ['marital_status', 'VARCHAR(30)'],
      ['nationality', 'VARCHAR(100)'],
      ['country_of_residence', 'VARCHAR(100)'],
      ['id_number', 'VARCHAR(100)'],
      ['religion', 'VARCHAR(100)'],
      ['disability_disclosed', 'BOOLEAN DEFAULT false'],
      ['disability_details', 'TEXT'],
      ['funding_source', 'VARCHAR(100)'],
      ['address', 'TEXT'],
      ['town', 'VARCHAR(100)'],
      ['county', 'VARCHAR(100)'],
      ['kin_name', 'VARCHAR(200)'],
      ['kin_relationship', 'VARCHAR(100)'],
      ['kin_phone', 'VARCHAR(30)'],
      ['kin_email', 'VARCHAR(255)'],
      ['kin_address', 'TEXT'],
      ['academic_history', "JSONB DEFAULT '[]'"],
      ['drive_folder_id', 'VARCHAR(255)'],
      ['passport_photo_folder_id', 'VARCHAR(255)'],
      ['identity_docs_folder_id', 'VARCHAR(255)'],
      ['academic_docs_folder_id', 'VARCHAR(255)'],
      ['passport_photo_url', 'VARCHAR(500)'],
      ['passport_photo_drive_id', 'VARCHAR(255)'],
      ['documents', "JSONB DEFAULT '[]'"],
      ['payment_status', "VARCHAR(20) DEFAULT 'pending'"],
      ['admin_notes', 'TEXT'],
      ['applied_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
      ['updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP']
    ])

    await pool.query(`
      ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
      ALTER TABLE applications ADD CONSTRAINT applications_status_check 
        CHECK (status IN ('pending', 'submitted', 'under_review', 'reviewing', 'accepted', 'offered', 'admitted', 'enrolled', 'rejected'));
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS application_choices (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        programme_intake_id INTEGER REFERENCES programme_intakes(id) ON DELETE CASCADE,
        campus_id INTEGER REFERENCES campuses(id) ON DELETE SET NULL,
        preference_order INTEGER NOT NULL,
        status VARCHAR(30) DEFAULT 'pending',
        reviewer_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await ensureTableColumns('application_choices', [
      ['status', "VARCHAR(30) DEFAULT 'pending'"],
      ['reviewer_notes', 'TEXT'],
      ['campus_id', 'INTEGER REFERENCES campuses(id) ON DELETE SET NULL']
    ])

    // Announcements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        campus VARCHAR(100) NOT NULL DEFAULT 'All',
        published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Rooms table for timetables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 40,
        type VARCHAR(50) DEFAULT 'Classroom',
        building VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Class Schedules table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_schedules (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
        lecturer_id INTEGER,
        lecturer_table_id INTEGER REFERENCES lecturers(id) ON DELETE SET NULL,
        academic_term_id INTEGER REFERENCES academic_terms(id) ON DELETE CASCADE,
        day_of_week VARCHAR(20) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Class Sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_sessions (
        id SERIAL PRIMARY KEY,
        schedule_id INTEGER REFERENCES class_schedules(id) ON DELETE CASCADE,
        date DATE DEFAULT CURRENT_DATE,
        start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        end_time TIMESTAMP WITH TIME ZONE,
        session_secret VARCHAR(255) NOT NULL,
        status VARCHAR(30) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await ensureTableColumns('class_sessions', [
      ['date', 'DATE DEFAULT CURRENT_DATE'],
      ['start_time', 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()'],
      ['end_time', 'TIMESTAMP WITH TIME ZONE'],
      ['status', "VARCHAR(30) DEFAULT 'active'"],
      ['updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP']
    ])

    // Attendance Records table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES class_sessions(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        verification_type VARCHAR(50) NOT NULL DEFAULT 'QR_GPS',
        latitude NUMERIC,
        longitude NUMERIC,
        is_mocked_location BOOLEAN DEFAULT false,
        status VARCHAR(30) DEFAULT 'Present',
        scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        x_coord NUMERIC,
        y_coord NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (session_id, student_id)
      )
    `)
    await ensureTableColumns('attendance_records', [
      ['verification_type', "VARCHAR(50) NOT NULL DEFAULT 'QR_GPS'"],
      ['latitude', 'NUMERIC'],
      ['longitude', 'NUMERIC'],
      ['is_mocked_location', 'BOOLEAN DEFAULT false'],
      ['status', "VARCHAR(30) DEFAULT 'Present'"],
      ['scan_time', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
      ['x_coord', 'NUMERIC'],
      ['y_coord', 'NUMERIC']
    ])

    // BLE Witness Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ble_witness_logs (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES class_sessions(id) ON DELETE CASCADE,
        reporter_student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        target_ephemeral_id VARCHAR(100) NOT NULL,
        rssi INTEGER NOT NULL,
        window_index INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Student Exam PINs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_exam_pins (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        pin VARCHAR(20) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for better performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_programmes_type ON programmes(type)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_programmes_active ON programmes(active)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_programmes_slug ON programmes(slug)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_applications_intake_id ON applications(intake_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_application_choices_application_id ON application_choices(application_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_application_choices_programme_intake_id ON application_choices(programme_intake_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published)`)

    // About hero table (single record managed by admin)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS about_hero (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        excerpt TEXT,
        content TEXT,
        featured_image_url TEXT,
        file_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // About page sections managed by admin
    await pool.query(`
      CREATE TABLE IF NOT EXISTS about_sections (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        content TEXT,
        section_type VARCHAR(50) DEFAULT 'standard',
        metadata JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Homepage 'Why Multitech' cards managed by admin
    await pool.query(`
      CREATE TABLE IF NOT EXISTS home_cards (
        id SERIAL PRIMARY KEY,
        icon VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        points JSONB DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      ALTER TABLE about_sections
      ADD COLUMN IF NOT EXISTS section_type VARCHAR(50) DEFAULT 'standard'
    `)
    await pool.query(`
      ALTER TABLE about_sections
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'
    `)

    // Home reasons/cards for the homepage "Why Multitech Business School"
    await pool.query(`
      CREATE TABLE IF NOT EXISTS home_reasons (
        id SERIAL PRIMARY KEY,
        icon VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        points JSONB DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Contact form messages stored for admin inbox and audit
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_messages (
        id SERIAL PRIMARY KEY,
        sender_name VARCHAR(255) NOT NULL,
        sender_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        page_url VARCHAR(255),
        destination_email VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
        is_read BOOLEAN DEFAULT false,
        delivery_error_message TEXT,
        admin_reply TEXT,
        reply_status VARCHAR(50) DEFAULT 'pending' CHECK (reply_status IN ('pending', 'sent', 'failed')),
        reply_error_message TEXT,
        auto_reply_status VARCHAR(50) DEFAULT 'pending' CHECK (auto_reply_status IN ('pending', 'sent', 'failed', 'skipped')),
        auto_reply_error_message TEXT,
        auto_reply_sent_at TIMESTAMP,
        admin_replied_at TIMESTAMP,
        replied_by INTEGER,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_messages_created_at ON email_messages(created_at DESC)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_messages_status ON email_messages(status)`)
    await pool.query(`ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS delivery_error_message TEXT`)
    await pool.query(`ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS reply_error_message TEXT`)
    await pool.query(`ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS auto_reply_status VARCHAR(50) DEFAULT 'pending'`)
    await pool.query(`ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS auto_reply_error_message TEXT`)
    await pool.query(`ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS auto_reply_sent_at TIMESTAMP`)

        // Mailing list subscribers (e.g. Multitech Insider)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mailing_list_subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        list_name VARCHAR(100) NOT NULL DEFAULT 'Multitech Insider',
        source VARCHAR(100) NOT NULL DEFAULT 'contact_form',
        status VARCHAR(50) NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_mailing_list_email ON mailing_list_subscribers(email)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_mailing_list_status ON mailing_list_subscribers(status)`)

    console.log('Database schema initialized successfully!')
    return true
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  }
}

export default initializeDatabase

