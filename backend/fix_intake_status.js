import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

async function fixIntakeStatus() {
  try {
    // Update any intake with status='active' to status='open'
    const result = await pool.query(
      `UPDATE intakes SET status = 'open' WHERE status = 'active' RETURNING id, name, status`
    )
    console.log('Fixed intakes:', result.rows)
    console.log(`Updated ${result.rowCount} record(s)`)
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await pool.end()
  }
}

fixIntakeStatus()
