import ws from 'ws'
import https from 'https'
import dns from 'dns'
import { neonConfig, Pool } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

// Force IPv4-only DNS to avoid ENETUNREACH on IPv6 addresses
dns.setDefaultResultOrder('ipv4first')

// Custom WebSocket class that forces IPv4 DNS resolution
class IPv4WebSocket extends ws {
  constructor(address, protocols, options) {
    super(address, protocols, {
      ...options,
      lookup: (hostname, opts, cb) => {
        dns.lookup(hostname, { ...opts, family: 4 }, cb)
      },
      agent: new https.Agent({ family: 4 })
    })
  }
}

neonConfig.webSocketConstructor = IPv4WebSocket

const seedAdmin = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  })

  let client
  try {
    console.log('🌱 Connecting to database...')
    client = await pool.connect()
    console.log('✓ Database connected successfully!')

    // Create programmes table if it doesn't exist
    await client.query(`
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
    console.log('✓ Programmes table created')

    // Create applications table if it doesn't exist
    await client.query(`
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
    console.log('✓ Applications table created')

    // Create announcements table if it doesn't exist
    await client.query(`
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
    console.log('✓ Announcements table created')

    // Create articles table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        featured_image_url VARCHAR(255),
        file_id VARCHAR(255),
        is_pinned BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ Articles table created')

    // Create admin_users table if it doesn't exist
    await client.query(`
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
    console.log('✓ Admin users table created')

    // Create settings table for app configuration if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ Settings table created')

    // Create activity_logs table if it doesn't exist
    await client.query(`
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
    console.log('✓ Activity logs table created')

    // Create indexes on activity_logs
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON activity_logs(admin_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC)`)

    // Check if admin already exists
    const existingAdmin = await client.query(
      'SELECT id FROM admin_users WHERE username = $1',
      ['Knowledge']
    )

    if (existingAdmin.rows.length > 0) {
      console.log('⚠ Admin user already exists')
      client.release()
      await pool.end()
      process.exit(0)
    }

    // Create default super admin
    const hashedPassword = await bcrypt.hash('Knowben0181?', 10)
    await client.query(
      `INSERT INTO admin_users (username, email, password, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, role, status`,
      ['Knowledge', 'cbrainic@gmail.com', hashedPassword, 'superadmin', 'active']
    )

    console.log('✓ Super admin created successfully!')
    console.log('  Username: Knowledge')
    console.log('  Email: cbrainic@gmail.com')
    console.log('  Password: Knowben0181?')
    console.log('  Role: superadmin')

    client.release()
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message || error)
    if (error.code) console.error('  code:', error.code)
    if (client) client.release()
    await pool.end().catch(() => {})
    process.exit(1)
  }
}

seedAdmin()
