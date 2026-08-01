import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

async function fixDescriptionColumn() {
  try {
    await pool.query(`
      ALTER TABLE functional_fees 
      ALTER COLUMN description TYPE TEXT;
    `)
    console.log('✅ Altered description column to TEXT in functional_fees table')
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await pool.end()
  }
}

fixDescriptionColumn()
