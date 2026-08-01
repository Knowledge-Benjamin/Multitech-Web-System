import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

async function checkIntakes() {
  try {
    const intakes = await pool.query('SELECT id, name, status, application_start_date, application_end_date FROM intakes ORDER BY created_at DESC')
    console.log('\n=== ALL INTAKES IN DB ===')
    console.log(JSON.stringify(intakes.rows, null, 2))
    console.log(`Total: ${intakes.rowCount} intake(s)`)

    const pi = await pool.query('SELECT pi.id, pi.intake_id, pi.programme_id, pi.intake_status, p.name as programme_name FROM programme_intakes pi JOIN programmes p ON pi.programme_id = p.id ORDER BY pi.intake_id')
    console.log('\n=== PROGRAMME_INTAKES ===')
    console.log(JSON.stringify(pi.rows, null, 2))
    console.log(`Total: ${pi.rowCount} link(s)`)
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await pool.end()
  }
}

checkIntakes()
