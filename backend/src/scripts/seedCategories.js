import pool from '../config/database.js'

const seedCategories = async () => {
  try {
    console.log('Creating programme_categories table...')
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS programme_categories (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        image_url VARCHAR(255),
        gdrive_file_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log('Inserting default categories...')
    
    const categories = [
      'Undergraduate Programmes',
      'Postgraduate Programmes',
      'Diploma/Certificate Courses',
      'Professional Courses'
    ]

    for (const title of categories) {
      await pool.query(`
        INSERT INTO programme_categories (title)
        VALUES ($1)
        ON CONFLICT (title) DO NOTHING
      `, [title])
    }

    console.log('Categories seeded successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding categories:', error)
    process.exit(1)
  }
}

seedCategories()
