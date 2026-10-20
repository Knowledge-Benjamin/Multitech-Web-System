import pool from '../config/database.js';

async function migrate() {
  try {
    console.log('Updating applications_status_check constraint...');
    await pool.query(`
      ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
      ALTER TABLE applications ADD CONSTRAINT applications_status_check 
        CHECK (status IN ('pending', 'submitted', 'under_review', 'reviewing', 'accepted', 'offered', 'admitted', 'enrolled', 'rejected'));
    `);
    console.log('Successfully updated applications_status_check constraint!');

    // Verify
    const res = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'applications' AND c.conname = 'applications_status_check';
    `);
    console.log('New constraint:', res.rows[0]);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrate();
