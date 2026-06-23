import pool from './src/config/database.js'
const queries = [
  "ALTER TABLE programme_fees ADD COLUMN IF NOT EXISTS description TEXT;",
  "ALTER TABLE programme_fees ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT true;"
]

for (const query of queries) {
  try {
    await pool.query(query)
    console.log(`Executed: ${query}`)
  } catch (err) {
    console.error(`Failed: ${query}`, err.message)
  }
}
process.exit(0)
