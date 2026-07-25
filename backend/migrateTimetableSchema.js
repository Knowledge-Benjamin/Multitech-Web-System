import pool from './src/config/database.js'

async function migrateTimetable() {
  const client = await pool.connect()
  try {
    console.log('Starting Timetable Schema Migration...')
    await client.query('BEGIN')

    // 1. Rooms
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL, -- e.g., "Lecture Room 1"
        capacity INTEGER NOT NULL DEFAULT 30,
        type VARCHAR(50) DEFAULT 'Classroom', -- Classroom, Lab, Auditorium
        building VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created rooms table.')

    // 2. Class Schedules (Timetable mapping)
    await client.query(`
      CREATE TABLE IF NOT EXISTS class_schedules (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id) ON DELETE RESTRICT,
        lecturer_id INTEGER REFERENCES admin_users(id) ON DELETE RESTRICT, -- Using admin_users where role='teacher'
        academic_term_id INTEGER REFERENCES academic_terms(id) ON DELETE CASCADE,
        day_of_week VARCHAR(15) NOT NULL, -- Monday, Tuesday, etc.
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created class_schedules table.')

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

migrateTimetable()
