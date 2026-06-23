import pool from './src/config/database.js'

const result = await pool.query(`UPDATE programmes SET active = true WHERE active IS NULL RETURNING id, name`)
console.log('Restored programmes:', result.rows)
process.exit(0)
