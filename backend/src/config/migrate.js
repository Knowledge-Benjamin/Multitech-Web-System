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
      CREATE TABLE IF NOT EXISTS application_choices (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        programme_intake_id INTEGER REFERENCES programme_intakes(id) ON DELETE CASCADE,
        preference_order INTEGER NOT NULL,
        status VARCHAR(30) DEFAULT 'pending',
        reviewer_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

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

    console.log('Database schema initialized successfully!')
    return true
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  }
}

export default initializeDatabase

