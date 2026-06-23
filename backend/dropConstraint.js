import pool from './src/config/database.js'

async function dropConstraint() {
  try {
    await pool.query('ALTER TABLE functional_fees DROP CONSTRAINT functional_fees_applies_to_check;')
    console.log('Constraint dropped')
  } catch (err) {
    console.error('Failed to drop constraint:', err)
  }
  process.exit(0)
}

dropConstraint()
