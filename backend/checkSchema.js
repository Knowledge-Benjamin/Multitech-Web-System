import pool from './src/config/database.js'
const result = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'functional_fees'")
console.log(result.rows)
process.exit(0)
