import pkg from 'pg'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config()
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function runMigration() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    console.log('Creating lecturers table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS lecturers (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log('Creating course_assignments table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_assignments (
        id SERIAL PRIMARY KEY,
        lecturer_id INTEGER REFERENCES lecturers(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        academic_term_id INTEGER REFERENCES academic_terms(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lecturer_id, course_id, academic_term_id)
      )
    `)

    console.log('Creating course_materials table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_materials (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        lecturer_id INTEGER REFERENCES lecturers(id) ON DELETE SET NULL,
        academic_term_id INTEGER REFERENCES academic_terms(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        drive_file_id VARCHAR(255) NOT NULL,
        drive_file_url VARCHAR(500) NOT NULL,
        file_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query('COMMIT')
    console.log('Lecturer migration completed successfully.')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Migration failed:', error)
  } finally {
    client.release()
    await pool.end()
    process.exit(0)
  }
}

runMigration()
