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

    // Ensure default contact destination email exists (admin-managed)
    try {
      const res = await pool.query('SELECT setting_value FROM settings WHERE setting_key = $1', ['contact_destination_email'])
      if (res.rows.length === 0) {
        await pool.query(
          `INSERT INTO settings (setting_key, setting_value, updated_at) VALUES ($1, $2, NOW())`,
          ['contact_destination_email', 'inquiries@multitech.ac.ug']
        )
        console.log('✓ Default contact_destination_email inserted')
      }
    } catch (err) {
      console.warn('Could not ensure default contact_destination_email:', err.message)
    }

    // Ensure the public WhatsApp CTA has an initial admin-editable number
    try {
      const whatsappRes = await pool.query('SELECT setting_value FROM settings WHERE setting_key = $1', ['whatsapp_cta_number'])
      if (whatsappRes.rows.length === 0) {
        await pool.query(
          `INSERT INTO settings (setting_key, setting_value, updated_at) VALUES ($1, $2, NOW())`,
          ['whatsapp_cta_number', '256774461072']
        )
        console.log('✓ Default whatsapp_cta_number inserted')
      }
    } catch (err) {
      console.warn('Could not ensure default whatsapp_cta_number:', err.message)
    }

    // Ensure default application acknowledgement template exists
    try {
      const templateRes = await pool.query('SELECT setting_value FROM settings WHERE setting_key = $1', ['application_acknowledgement_template'])
      if (templateRes.rows.length === 0) {
        await pool.query(
          `INSERT INTO settings (setting_key, setting_value, updated_at) VALUES ($1, $2, NOW())`,
          ['application_acknowledgement_template', `Dear {{name}},\n\nThank you for submitting your application to Multitech Business School for the {{programmeName}} programme.\n\nYour application reference is {{applicationReference}}.\n\nApplication status: {{status}}\n\nYou can sign in to track your application with the details below:\nLogin email: {{loginEmail}}\nPassword: {{loginPassword}}\n\nIf you have questions, please reply to this email or contact our admissions team.\n\nBest regards,\nMultitech Business School Admissions Team`]
        )
        console.log('✓ Default application_acknowledgement_template inserted')
      }
    } catch (err) {
      console.warn('Could not ensure default acknowledgement template:', err.message)
    }

    // Create contact message inbox table for admin
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

    await pool.query(`ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS delivery_error_message TEXT`)
    await pool.query(`ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS reply_error_message TEXT`)
    await pool.query(`ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS auto_reply_status VARCHAR(50) DEFAULT 'pending'`)
    await pool.query(`ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS auto_reply_error_message TEXT`)
    await pool.query(`ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS auto_reply_sent_at TIMESTAMP`)

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
