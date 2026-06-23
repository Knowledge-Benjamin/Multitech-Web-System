import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'
import { uploadToDrive, deleteFromDrive } from '../utils/googleDriveService.js'

// Get all categories
export const getCategories = asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM programme_categories ORDER BY id ASC')
  res.json({ success: true, data: result.rows })
})

// Upload/Replace category image (admin only)
export const uploadCategoryImage = asyncHandler(async (req, res) => {
  const { id } = req.params
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image provided' })
  }

  // 1. Get current category
  const categoryResult = await pool.query('SELECT * FROM programme_categories WHERE id = $1', [id])
  if (categoryResult.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Category not found' })
  }
  
  const category = categoryResult.rows[0]

  // 2. Upload new image to Google Drive inside 'Programme Categories' subfolder
  const driveResponse = await uploadToDrive(req.file, 'Programme Categories')

  // 3. Update database
  const updateResult = await pool.query(
    `UPDATE programme_categories 
     SET image_url = $1, gdrive_file_id = $2, updated_at = NOW() 
     WHERE id = $3 
     RETURNING *`,
    [driveResponse.url, driveResponse.fileId, id]
  )

  // 4. Delete old image if it exists
  if (category.gdrive_file_id) {
    await deleteFromDrive(category.gdrive_file_id).catch(err => {
      console.error('Failed to delete old category image from Drive:', err)
    })
  }

  res.json({ success: true, data: updateResult.rows[0] })
})
