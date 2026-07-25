import pool from './src/config/database.js'

async function checkTerms() {
  try {
    const { rows } = await pool.query('SELECT * FROM academic_terms')
    console.log(rows)
  } catch (err) {
    console.error(err)
  } finally {
    process.exit(0)
  }
}

checkTerms()
