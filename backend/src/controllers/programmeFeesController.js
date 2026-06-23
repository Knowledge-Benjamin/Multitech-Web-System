import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

// Get ALL programme fees (admin view, joined with programme name)
export const getAllProgrammeFees = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT pf.*, p.name as programme_name 
     FROM programme_fees pf
     LEFT JOIN programmes p ON pf.programme_id = p.id
     ORDER BY p.name ASC, pf.fee_name ASC`
  )
  res.json({ success: true, data: result.rows })
})

// Get fees for a specific programme (public)
export const getProgrammeFees = asyncHandler(async (req, res) => {
  const { programme_id } = req.params
  const result = await pool.query(
    'SELECT * FROM programme_fees WHERE programme_id = $1 ORDER BY fee_name ASC',
    [programme_id]
  )
  res.json({ success: true, data: result.rows })
})

// Create programme fee (admin) — accepts programme_id from body
export const createProgrammeFee = asyncHandler(async (req, res) => {
  const { programme_id, fee_name, national_amount, international_amount, description, is_mandatory } = req.body

  if (!programme_id || !fee_name || national_amount === undefined || international_amount === undefined) {
    return res.status(400).json({ success: false, message: 'programme_id, fee_name, national_amount and international_amount are required' })
  }

  const result = await pool.query(
    `INSERT INTO programme_fees (programme_id, fee_name, national_amount, international_amount, description, is_mandatory, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW()) RETURNING *`,
    [programme_id, fee_name, national_amount, international_amount, description || null, is_mandatory === true || is_mandatory === 'true']
  )
  res.status(201).json({ success: true, data: result.rows[0] })
})

// Update programme fee (admin)
export const updateProgrammeFee = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { programme_id, fee_name, national_amount, international_amount, description, is_mandatory, active } = req.body

  const result = await pool.query(
    `UPDATE programme_fees 
     SET programme_id = COALESCE($1, programme_id),
         fee_name = $2, national_amount = $3, international_amount = $4, description = $5, is_mandatory = $6,
         active = COALESCE($7, active, true), updated_at = NOW()
     WHERE id = $8 RETURNING *`,
    [programme_id || null, fee_name, national_amount, international_amount, description || null, 
     is_mandatory === true || is_mandatory === 'true',
     active !== undefined ? (active === true || active === 'true') : null,
     id]
  )

  if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Fee not found' })
  res.json({ success: true, data: result.rows[0] })
})

// Delete programme fee (admin)
export const deleteProgrammeFee = asyncHandler(async (req, res) => {
  const { id } = req.params
  const result = await pool.query('DELETE FROM programme_fees WHERE id = $1 RETURNING id', [id])
  
  if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Fee not found' })
  res.json({ success: true, message: 'Fee deleted' })
})
