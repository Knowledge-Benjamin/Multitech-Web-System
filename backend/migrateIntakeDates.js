import pool from './src/config/database.js'

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Add application date columns to intakes table
    await client.query(`
      ALTER TABLE intakes
      ADD COLUMN IF NOT EXISTS application_start_date DATE,
      ADD COLUMN IF NOT EXISTS application_end_date DATE
    `)
    console.log('Added application_start_date and application_end_date to intakes table.')

    // Update legacy intake with a wide open window so it still works
    await client.query(`
      UPDATE intakes SET 
        application_start_date = '2020-01-01',
        application_end_date = '2030-12-31'
      WHERE application_start_date IS NULL
    `)
    console.log('Set default dates on legacy intakes.')

    await client.query('COMMIT')
    console.log('Migration complete.')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Migration failed:', err)
  } finally {
    client.release()
    pool.end()
    process.exit(0)
  }
}
migrate()
