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

    console.log('Database schema initialized successfully!')
    return true
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  }
}

export default initializeDatabase
