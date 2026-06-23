import ws from 'ws'
import https from 'https'
import dns from 'dns'
import { neonConfig, Pool } from '@neondatabase/serverless'
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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const migrate = async () => {
  let client
  try {
    console.log('🔄 Connecting to database...')
    client = await pool.connect()
    console.log('✓ Connected!')

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ Migration successful: settings table created/verified')

    client.release()
    await pool.end()
    process.exit(0)
  } catch (err) {
    console.error('❌ Migration failed:', err.message || err)
    if (err.code) console.error('  code:', err.code)
    if (client) client.release()
    await pool.end().catch(() => {})
    process.exit(1)
  }
}

migrate()
