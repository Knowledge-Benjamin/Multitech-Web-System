import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    console.log('Starting Student Portal Features migration...')

    // 1. Course Announcements
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_announcements (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        lecturer_id INTEGER REFERENCES lecturers(id) ON DELETE CASCADE,
        academic_term_id INTEGER REFERENCES academic_terms(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created course_announcements table.')

    // 2. Class Schedules -> Lecturers linkage
    // We add a new column referencing the new lecturers table. We keep the old lecturer_id (which references admin_users)
    // for backwards compatibility, but it can be null if lecturer_table_id is used.
    await client.query(`
      ALTER TABLE class_schedules
      ADD COLUMN IF NOT EXISTS lecturer_table_id INTEGER REFERENCES lecturers(id) ON DELETE SET NULL,
      ALTER COLUMN lecturer_id DROP NOT NULL
    `)
    console.log('Added lecturer_table_id to class_schedules.')

    // 3. Grades table -> add 'source' to distinguish between offline (manual) and online_exam_portal
    await client.query(`
      ALTER TABLE grades
      ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'offline'
    `)
    console.log('Added source to grades.')

    await client.query('COMMIT')
    console.log('Migration successful!')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Migration failed:', err)
  } finally {
    client.release()
    process.exit(0)
  }
}

migrate()
