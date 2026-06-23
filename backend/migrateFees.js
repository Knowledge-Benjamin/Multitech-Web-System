import pool from './src/config/database.js'

const queries = [
  "ALTER TABLE programmes RENAME COLUMN local_tuition_fee TO national_tuition_fee;",
  
  "ALTER TABLE functional_fees RENAME COLUMN amount TO national_amount;",
  "ALTER TABLE functional_fees ADD COLUMN IF NOT EXISTS international_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;",
  
  "ALTER TABLE programme_fees RENAME COLUMN amount TO national_amount;",
  "ALTER TABLE programme_fees ADD COLUMN IF NOT EXISTS international_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;"
]

async function migrate() {
  for (const query of queries) {
    try {
      await pool.query(query)
      console.log(`Executed: ${query}`)
    } catch (err) {
      console.error(`Failed: ${query}`, err.message)
    }
  }
  process.exit(0)
}

migrate()
