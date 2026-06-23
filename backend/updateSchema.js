import pool from './src/config/database.js'
const queries = [
  "ALTER TABLE functional_fees RENAME COLUMN name TO fee_name;",
  "ALTER TABLE functional_fees RENAME COLUMN applies_to TO description;",
  "ALTER TABLE functional_fees ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT true;"
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
