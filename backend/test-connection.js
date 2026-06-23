import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

console.log('🔍 Testing Neon Database Connection...\n')
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Loaded' : '❌ Missing')
console.log('Connection String Preview:', process.env.DATABASE_URL?.substring(0, 50) + '...\n')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true, // Enforced for Neon
  max: 1,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000, 
})

// Detailed error handlers
pool.on('error', (err) => {
  console.error('Pool error:', err.message)
  console.error('Error code:', err.code)
  console.error('Full error:', err)
})

async function testConnection() {
  try {
    console.log('⏳ Attempting connection...')
    const client = await pool.connect()
    console.log('✅ Connected successfully!')
    
    const result = await client.query('SELECT NOW() as current_time, version() as db_version')
    console.log('\n📊 Database Info:')
    console.log('   Time:', result.rows[0].current_time)
    console.log('   Version:', result.rows[0].db_version)
    
    client.release()
    await pool.end()
    console.log('\n✅ Connection test passed!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Connection failed!')
    console.error('Error Type:', error.constructor.name)
    console.error('Error Code:', error.code)
    console.error('Error Message:', error.message)
    console.error('\nFull Error:')
    console.error(error)
    
    await pool.end()
    process.exit(1)
  }
}

testConnection()