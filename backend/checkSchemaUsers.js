import pool from './src/config/database.js'
const result = await pool.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('users', 'applications')")
console.log(JSON.stringify(result.rows, null, 2))
process.exit(0)
