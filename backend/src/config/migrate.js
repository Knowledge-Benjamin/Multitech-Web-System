import pool from '../config/database.js'

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Applications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        programme_id INTEGER NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
        qualifications TEXT NOT NULL,
        additional_info TEXT,
        status VARCHAR(50) DEFAULT 'submitted' CHECK(status IN ('submitted', 'under_review', 'accepted', 'rejected')),
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
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_applications_programme_id ON applications(programme_id)`)
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

    console.log('Database schema initialized successfully!')
    return true
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  }
}

export default initializeDatabase

