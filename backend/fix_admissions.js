import pool from './src/config/database.js'

async function fixAdmittedStudents() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Find applications that are admitted but have no student record
    const { rows } = await client.query(`
      SELECT a.id as application_id, a.programme_id, sa.id as account_id
      FROM applications a
      JOIN student_accounts sa ON a.id = sa.application_id
      LEFT JOIN students s ON sa.id = s.student_account_id
      WHERE a.status = 'admitted' AND s.id IS NULL
    `)

    console.log(`Found ${rows.length} admitted applications missing student records.`)

    if (rows.length > 0) {
      const termRes = await client.query("SELECT id FROM academic_terms ORDER BY start_date DESC LIMIT 1")
      const intakeTermId = termRes.rows.length > 0 ? termRes.rows[0].id : null

      for (const row of rows) {
        const year = new Date().getFullYear().toString().slice(-2)
        const randomNum = Math.floor(1000 + Math.random() * 9000)
        const studentNumber = `${year}/U/${randomNum}/PS`

        await client.query(
          `INSERT INTO students (student_account_id, application_id, student_number, programme_id, intake_term_id) 
           VALUES ($1, $2, $3, $4, $5)`,
          [row.account_id, row.application_id, studentNumber, row.programme_id, intakeTermId]
        )
        console.log(`Created student ${studentNumber} for application ${row.application_id}`)
      }
    }

    await client.query('COMMIT')
    console.log('Done.')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
  } finally {
    client.release()
    process.exit(0)
  }
}

fixAdmittedStudents()
