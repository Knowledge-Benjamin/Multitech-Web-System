import pool from '../config/database.js'

export const getSetting = async (key) => {
  const result = await pool.query(
    'SELECT setting_value FROM settings WHERE setting_key = $1',
    [key]
  )
  return result.rows[0]?.setting_value ?? null
}

export const getSettings = async (keys = []) => {
  if (keys.length === 0) return {}

  const result = await pool.query(
    'SELECT setting_key, setting_value FROM settings WHERE setting_key = ANY($1)',
    [keys]
  )

  return result.rows.reduce((acc, row) => {
    acc[row.setting_key] = row.setting_value
    return acc
  }, {})
}

export const upsertSetting = async (key, value) => {
  await pool.query(
    `INSERT INTO settings (setting_key, setting_value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (setting_key) DO UPDATE
     SET setting_value = EXCLUDED.setting_value,
         updated_at = NOW()`,
    [key, value]
  )
  return true
}
