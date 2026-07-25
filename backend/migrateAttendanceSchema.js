import pool from './src/config/database.js'

async function migrateAttendance() {
  const client = await pool.connect()
  try {
    console.log('Starting Attendance Schema Migration...')
    await client.query('BEGIN')

    // 1. Class Sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS class_sessions (
        id SERIAL PRIMARY KEY,
        schedule_id INTEGER REFERENCES class_schedules(id) ON DELETE CASCADE,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        session_secret VARCHAR(255) NOT NULL, -- Cryptographic seed for TOTP QR
        status VARCHAR(20) DEFAULT 'active', -- active, ended
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created class_sessions table.')

    // 2. Attendance Records
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES class_sessions(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        verification_type VARCHAR(50) NOT NULL, -- Manual, BLE_Mesh, GPS_Only
        latitude NUMERIC(10, 8),
        longitude NUMERIC(11, 8),
        is_mocked_location BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'Present', -- Present, Absent, Flagged
        scan_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, student_id)
      )
    `)
    console.log('Created attendance_records table.')

    // 3. BLE Witness Logs (Raw peer-to-peer data)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ble_witness_logs (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES class_sessions(id) ON DELETE CASCADE,
        reporter_student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        target_ephemeral_id VARCHAR(255) NOT NULL, -- Could be another student or lecturer '0'
        rssi INTEGER NOT NULL,
        window_index INTEGER NOT NULL, -- The time slice Q_i
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created ble_witness_logs table.')

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

migrateAttendance()
