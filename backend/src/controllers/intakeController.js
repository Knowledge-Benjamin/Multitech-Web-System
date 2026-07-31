import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

export const getIntakes = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT i.*,
      (SELECT json_agg(json_build_object(
        'programme_id', pi.programme_id,
        'intake_status', pi.intake_status,
        'programme_name', p.name
      ))
      FROM programme_intakes pi
      JOIN programmes p ON p.id = pi.programme_id
      WHERE pi.intake_id = i.id
      ) AS programmes
    FROM intakes i
    ORDER BY i.created_at DESC
  `)
  res.json({ success: true, data: result.rows })
})

export const getActiveIntakes = asyncHandler(async (req, res) => {
  // 'active' is the admin-facing status; original migration used 'open' and 'upcoming'
  // We return all intakes that are open OR active and still within the application window
  const now = new Date().toISOString().split('T')[0]
  const result = await pool.query(`
    SELECT * FROM intakes 
    WHERE status IN ('open', 'active')
      AND (application_start_date IS NULL OR application_start_date <= $1)
      AND (application_end_date IS NULL OR application_end_date >= $1)
    ORDER BY created_at DESC
  `, [now])
  res.json({ success: true, data: result.rows })
})

export const createIntake = asyncHandler(async (req, res) => {
  const { name, application_start_date, application_end_date, application_fee, status, linkedProgrammes } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      `INSERT INTO intakes (name, application_start_date, application_end_date, application_fee, status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, application_start_date, application_end_date, application_fee || 0, status || 'active']
    )
    const intake = result.rows[0]

    if (linkedProgrammes && linkedProgrammes.length > 0) {
      for (const lp of linkedProgrammes) {
        await client.query(
          `INSERT INTO programme_intakes (intake_id, programme_id, intake_status) VALUES ($1, $2, $3)
           ON CONFLICT (intake_id, programme_id) DO UPDATE SET intake_status = $3`,
          [intake.id, lp.programme_id, lp.intake_status || 'open']
        )
      }
    }

    await client.query('COMMIT')
    res.status(201).json({ success: true, data: intake })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

export const updateIntake = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { name, application_start_date, application_end_date, application_fee, status, linkedProgrammes } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      `UPDATE intakes 
       SET name = $1, application_start_date = $2, application_end_date = $3, 
           application_fee = $4, status = $5, updated_at = NOW() 
       WHERE id = $6 RETURNING *`,
      [name, application_start_date, application_end_date, application_fee, status, id]
    )
    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Intake not found' })
    }

    if (linkedProgrammes !== undefined) {
      // Remove all existing links then re-insert
      await client.query('DELETE FROM programme_intakes WHERE intake_id = $1', [id])

      for (const lp of linkedProgrammes) {
        await client.query(
          `INSERT INTO programme_intakes (intake_id, programme_id, intake_status) VALUES ($1, $2, $3)`,
          [id, lp.programme_id, lp.intake_status || 'open']
        )
      }
    }

    await client.query('COMMIT')
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

export const getProgrammeIntakes = asyncHandler(async (req, res) => {
  const { id } = req.params
  const result = await pool.query(`
    SELECT pi.*, p.name as programme_name 
    FROM programme_intakes pi
    JOIN programmes p ON pi.programme_id = p.id
    WHERE pi.intake_id = $1
  `, [id])
  res.json({ success: true, data: result.rows })
})

export const linkProgrammeToIntake = asyncHandler(async (req, res) => {
  const { intake_id, programme_id, application_start_date, application_end_date, intake_status, quota } = req.body
  
  // check if exists
  const existing = await pool.query('SELECT id FROM programme_intakes WHERE intake_id = $1 AND programme_id = $2', [intake_id, programme_id])
  if (existing.rows.length > 0) {
    return res.status(400).json({ success: false, message: 'Programme already linked to this intake' })
  }

  const result = await pool.query(`
    INSERT INTO programme_intakes (intake_id, programme_id, application_start_date, application_end_date, intake_status, quota)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `, [intake_id, programme_id, application_start_date, application_end_date, intake_status || 'open', quota])
  
  res.status(201).json({ success: true, data: result.rows[0] })
})
