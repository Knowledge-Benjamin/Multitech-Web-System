import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const connectionString = process.env.DATABASE_URL

console.log('🔍 Testing different connection string variants...\n')

const variants = [
  {
    name: 'Original (with channel_binding)',
    url: connectionString
  },
  {
    name: 'Without channel_binding',
    url: connectionString?.replace('&channel_binding=require', '')
  },
  {
    name: 'With verify-full SSL',
    url: connectionString?.replace('sslmode=require', 'sslmode=verify-full')
  },
  {
    name: 'SSL disabled (localhost test)',
    url: 'postgresql://postgres:password@localhost:5432/neondb?sslmode=disable'
  }
]

async function testVariant(variant) {
  console.log(`\n📝 Testing: ${variant.name}`)
  console.log(`   URL: ${variant.url?.substring(0, 60)}...`)
  
  try {
    const pool = new Pool({
      connectionString: variant.url,
      enableChannelBinding: true,
      connectionTimeoutMillis: 5000,
    })
    
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    
    console.log('   ✅ SUCCESS - Connection works!')
    
    client.release()
    await pool.end()
    return true
  } catch (error) {
    console.log(`   ❌ FAILED - ${error.code}: ${error.message}`)
    return false
  }
}

async function runTests() {
  console.log('Testing connection string variants...\n')
  
  for (const variant of variants) {
    if (!variant.url) {
      console.log(`\n⚠️  Skipping: ${variant.name} (empty URL)`)
      continue
    }
    
    const success = await testVariant(variant)
    
    if (success) {
      console.log('\n✅ Found working connection string!')
      console.log(`Use: ${variant.name}`)
      process.exit(0)
    }
  }
  
  console.log('\n❌ No connection variants worked.')
  console.log('\nRecommendation: Set up local PostgreSQL instead')
  console.log('   cp .env.local .env')
  process.exit(1)
}

runTests()
