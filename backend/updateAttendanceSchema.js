import pool from './src/config/database.js'

async function addCoordinates() {
  const client = await pool.connect()
  try {
    console.log('Adding coordinate columns to attendance_records...')
    await client.query('BEGIN')

    await client.query(`
      ALTER TABLE attendance_records 
      ADD COLUMN IF NOT EXISTS x_coord NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS y_coord NUMERIC(5,2)
    `)

    await client.query('COMMIT')
    console.log('Migration successful!')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Migration failed:', err)
  } finally {
    client.release()
    process.exit(0)
  }
}

addCoordinates()
