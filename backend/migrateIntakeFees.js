import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

async function migrate() {
  try {
    // Add international_fee column to intakes
    await pool.query(`
      ALTER TABLE intakes 
      ADD COLUMN IF NOT EXISTS international_fee NUMERIC(10, 2) DEFAULT 0.00
    `)
    console.log('✅ Added international_fee column to intakes table')
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await pool.end()
  }
}

migrate()
