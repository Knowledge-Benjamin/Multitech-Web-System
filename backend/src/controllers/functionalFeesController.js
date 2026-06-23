import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

// Get all functional fees
export const getFunctionalFees = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM functional_fees ORDER BY fee_name ASC')
  res.json({ success: true, data: result.rows })
})

// Create functional fee (admin)
export const createFunctionalFee = asyncHandler(async (req, res) => {
  const { fee_name, national_amount, international_amount, description, is_mandatory } = req.body
  if (!fee_name || national_amount === undefined || international_amount === undefined) {
    return res.status(400).json({ success: false, message: 'fee_name, national_amount and international_amount are required' })
  }
  const result = await pool.query(
    `INSERT INTO functional_fees (fee_name, national_amount, international_amount, description, is_mandatory, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW()) RETURNING *`,
    [fee_name, national_amount, international_amount, description || null, is_mandatory === true || is_mandatory === 'true']
  )
  res.status(201).json({ success: true, data: result.rows[0] })
})

// Update functional fee (admin)
export const updateFunctionalFee = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { fee_name, national_amount, international_amount, description, is_mandatory, active } = req.body
  const result = await pool.query(
    `UPDATE functional_fees SET fee_name = $1, national_amount = $2, international_amount = $3, description = $4, is_mandatory = $5, active = COALESCE($6, active, true), updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [
      fee_name, 
      national_amount, 
      international_amount,
      description || null, 
      is_mandatory === true || is_mandatory === 'true', 
      active !== undefined ? (active === true || active === 'true') : null, 
      id
    ]
  )
  if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Fee not found' })
  res.json({ success: true, data: result.rows[0] })
})

// Delete functional fee (admin)
export const deleteFunctionalFee = asyncHandler(async (req, res) => {
  const { id } = req.params
  const result = await pool.query('DELETE FROM functional_fees WHERE id = $1 RETURNING id', [id])
  if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Fee not found' })
  res.json({ success: true, message: 'Fee deleted' })
})
