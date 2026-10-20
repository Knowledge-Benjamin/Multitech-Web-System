import pool from '../config/database.js';

async function migrate() {
  console.log('[ERP Migration] Adding assessment_type and weight_percentage to erp_exams...');
  try {
    await pool.query(`
      ALTER TABLE erp_exams 
        ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50) NOT NULL DEFAULT 'final_exam',
        ADD COLUMN IF NOT EXISTS weight_percentage NUMERIC(5,2) NOT NULL DEFAULT 60.00;
    `);
    console.log('[ERP Migration] Added columns.');

    const res = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'erp_exams' 
        AND column_name IN ('assessment_type', 'weight_percentage');
    `);
    console.log('[ERP Migration] Verified columns:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error('[ERP Migration] Failed:', err);
    process.exit(1);
  }
}

migrate();
