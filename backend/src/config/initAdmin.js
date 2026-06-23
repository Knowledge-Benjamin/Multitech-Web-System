import pool from './database.js'
import bcrypt from 'bcryptjs'

const initAdmin = async () => {
  try {
    // Test database connection with timeout
    const connectTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), 5000)
    )

    // Try to connect
    await Promise.race([
      pool.query('SELECT 1'),
      connectTimeout
    ])

    // Create admin users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create articles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        featured_image_url VARCHAR(255),
        file_id VARCHAR(255),
        is_pinned BOOLEAN DEFAULT false,
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create settings table for app configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create activity logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes on activity_logs
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON activity_logs(admin_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC)`)

    // Check if default admin exists
    const adminExists = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1',
      ['Knowledge']
    )

    if (adminExists.rows.length === 0) {
      // Create default admin account
      const hashedPassword = await bcrypt.hash('Knowben0181?', 10)
      await pool.query(
        'INSERT INTO admin_users (username, email, password, role) VALUES ($1, $2, $3, $4)',
        ['Knowledge', 'cbrainic@gmail.com', hashedPassword, 'superadmin']
      )
      console.log('✓ Default admin created (username: Knowledge, password: Knowben0181?)')
    }

    console.log('✓ Admin database initialized')
  } catch (error) {
    console.warn('⚠ Database not available:', error.message)
    console.warn('⚠ Server starting without database. Check your connection string.')
  }
}

export default initAdmin
