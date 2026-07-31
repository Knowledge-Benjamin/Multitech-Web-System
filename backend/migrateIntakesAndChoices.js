import pool from './src/config/database.js'

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('Starting Intakes and Multi-Choice Applications Migration...')
    await client.query('BEGIN')

    // 1. Create intakes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS intakes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        academic_year VARCHAR(50),
        application_fee NUMERIC(10, 2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, open, closed
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created intakes table.')

    // 2. Create programme_intakes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS programme_intakes (
        id SERIAL PRIMARY KEY,
        intake_id INTEGER REFERENCES intakes(id) ON DELETE CASCADE,
        programme_id INTEGER REFERENCES programmes(id) ON DELETE CASCADE,
        application_start_date DATE,
        application_end_date DATE,
        intake_status VARCHAR(20) DEFAULT 'closed', -- open, closed
        quota INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created programme_intakes table.')

    // 3. Create Default Intake if not exists
    const resIntake = await client.query(`
      INSERT INTO intakes (name, academic_year, application_fee, status)
      VALUES ('Default Legacy Intake', 'Legacy', 0.00, 'open')
      ON CONFLICT DO NOTHING
      RETURNING id
    `)
    let defaultIntakeId
    if (resIntake.rows.length > 0) {
      defaultIntakeId = resIntake.rows[0].id
    } else {
      const existing = await client.query(`SELECT id FROM intakes WHERE name = 'Default Legacy Intake'`)
      defaultIntakeId = existing.rows[0].id
    }
    console.log(`Default Intake ID: ${defaultIntakeId}`)

    // 4. Migrate Programmes to Programme_Intakes
    const programmes = await client.query(`
      SELECT id, intake_status, application_start_date, application_end_date 
      FROM programmes
    `)
    for (const prog of programmes.rows) {
      // Check if mapping already exists
      const existingMapping = await client.query(`
        SELECT id FROM programme_intakes WHERE intake_id = $1 AND programme_id = $2
      `, [defaultIntakeId, prog.id])
      
      if (existingMapping.rows.length === 0) {
        await client.query(`
          INSERT INTO programme_intakes (intake_id, programme_id, application_start_date, application_end_date, intake_status)
          VALUES ($1, $2, $3, $4, $5)
        `, [defaultIntakeId, prog.id, prog.application_start_date, prog.application_end_date, prog.intake_status])
      }
    }
    console.log('Migrated programmes to programme_intakes.')

    // 5. Update applications table (add intake_id, payment_status)
    await client.query(`
      ALTER TABLE applications 
      ADD COLUMN IF NOT EXISTS intake_id INTEGER REFERENCES intakes(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending'
    `)
    
    // Set default intake for existing applications
    await client.query(`
      UPDATE applications SET intake_id = $1 WHERE intake_id IS NULL
    `, [defaultIntakeId])
    console.log('Added intake_id and payment_status to applications.')

    // 6. Create application_choices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS application_choices (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        programme_intake_id INTEGER REFERENCES programme_intakes(id) ON DELETE CASCADE,
        preference_order INTEGER NOT NULL,
        status VARCHAR(30) DEFAULT 'pending', -- pending, offered, rejected, bypassed, accepted_by_student
        reviewer_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created application_choices table.')

    // 7. Migrate legacy applications to choices
    // We fetch all applications that have a programme_id and create a choice for them.
    const hasProgrammeIdCol = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='applications' and column_name='programme_id'
    `)
    
    if (hasProgrammeIdCol.rows.length > 0) {
      const apps = await client.query(`
        SELECT a.id, a.programme_id, pi.id as programme_intake_id
        FROM applications a
        JOIN programme_intakes pi ON pi.programme_id = a.programme_id AND pi.intake_id = a.intake_id
        WHERE a.programme_id IS NOT NULL
      `)
      
      let choicesAdded = 0
      for (const app of apps.rows) {
        // check if choice exists
        const choice = await client.query(`
          SELECT id FROM application_choices WHERE application_id = $1 AND preference_order = 1
        `, [app.id])
        if (choice.rows.length === 0) {
          await client.query(`
            INSERT INTO application_choices (application_id, programme_intake_id, preference_order, status)
            VALUES ($1, $2, 1, 'pending')
          `, [app.id, app.programme_intake_id])
          choicesAdded++
        }
      }
      console.log(`Migrated ${choicesAdded} applications to choices.`)

      // Map the status
      await client.query(`
        UPDATE application_choices ac
        SET status = 'rejected'
        FROM applications a
        WHERE ac.application_id = a.id AND a.status = 'rejected'
      `)
      await client.query(`
        UPDATE application_choices ac
        SET status = 'offered'
        FROM applications a
        WHERE ac.application_id = a.id AND a.status = 'offered'
      `)
      await client.query(`
        UPDATE application_choices ac
        SET status = 'accepted_by_student'
        FROM applications a
        WHERE ac.application_id = a.id AND a.status = 'enrolled'
      `)
      
      // Remove the old programme_id column
      await client.query(`
        ALTER TABLE applications DROP COLUMN programme_id
      `)
      console.log('Dropped programme_id from applications.')
    }

    // 8. Remove legacy columns from programmes
    const hasIntakeStatusCol = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name='programmes' and column_name='intake_status'
    `)
    if (hasIntakeStatusCol.rows.length > 0) {
      await client.query(`
        ALTER TABLE programmes 
        DROP COLUMN intake_status, 
        DROP COLUMN application_start_date, 
        DROP COLUMN application_end_date
      `)
      console.log('Dropped legacy intake columns from programmes.')
    }

    await client.query('COMMIT')
    console.log('Migration successful!')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Migration failed:', err)
  } finally {
    client.release()
    pool.end()
    process.exit(0)
  }
}

migrate()
