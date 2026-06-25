import dotenv from 'dotenv'
import initializeDatabase from '../config/migrate.js'

dotenv.config()

const migrate = async () => {
  try {
    console.log('🔄 Running schema migration...')
    await initializeDatabase()
    console.log('✅ Migration complete')
    process.exit(0)
  } catch (err) {
    console.error('❌ Migration failed:', err.message || err)
    if (err.code) console.error('  code:', err.code)
    process.exit(1)
  }
}

migrate()
