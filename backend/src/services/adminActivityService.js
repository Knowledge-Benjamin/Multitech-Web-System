import pool from '../config/database.js'

export const logActivity = async (adminId, action, entity_type, entity_id, details) => {
  await pool.query(
    `INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, details, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [adminId, action, entity_type, entity_id, details]
  )
}
