import pool from '../config/database.js';

async function migrate() {
  console.log('[Migration] Adding SEB settings columns to erp_exams...');
  try {
    await pool.query(`
      ALTER TABLE erp_exams 
        ADD COLUMN IF NOT EXISTS allow_file_upload BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS permitted_apps JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS seb_settings JSONB NOT NULL DEFAULT '{}';
    `);
    console.log('[Migration] Columns successfully added or already exist.');

    // Verify columns
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'erp_exams' 
        AND column_name IN ('allow_file_upload', 'permitted_apps', 'seb_settings');
    `);
    console.log('[Migration] Verified columns in erp_exams:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Failed:', err);
    process.exit(1);
  }
}

migrate();
