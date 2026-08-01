import pool from './src/config/database.js';

async function run() {
  try {
    await pool.query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT \'[]\'::jsonb');
    console.log('Successfully added modules column to courses table.');
    
    // Optional: Migrate existing curriculum data from programmes to their first course unit?
    // Not explicitly requested, and probably unsafe since we don't know which course unit they belong to.
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
