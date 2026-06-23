import pool from './src/config/database.js'
const result = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'student_accounts'")
console.log(JSON.stringify(result.rows, null, 2))
process.exit(0)
