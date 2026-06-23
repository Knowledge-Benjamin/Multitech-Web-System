import pool from '../config/database.js'

const addProgrammeImages = async () => {
  try {
    console.log('Adding image columns to programmes table...')
    
    await pool.query(`
      ALTER TABLE programmes 
      ADD COLUMN IF NOT EXISTS image_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS gdrive_file_id VARCHAR(255)
    `)

    console.log('Successfully added image columns!')
    process.exit(0)
  } catch (error) {
    console.error('Error adding image columns:', error)
    process.exit(1)
  }
}

addProgrammeImages()
