import pool from './src/config/database.js'
import dotenv from 'dotenv'
dotenv.config()

const fixUrls = async () => {
  try {
    // Fix /api/images/ID -> lh3.googleusercontent.com/d/ID
    const r1 = await pool.query(`
      UPDATE articles
      SET featured_image_url = REPLACE(featured_image_url, '/api/images/', 'https://lh3.googleusercontent.com/d/')
      WHERE featured_image_url LIKE '/api/images/%'
      RETURNING id, featured_image_url
    `)
    console.log('Fixed /api/images/ URLs:', r1.rows.length)

    // Fix uc?id= -> lh3 format
    const r2 = await pool.query(`
      UPDATE articles
      SET featured_image_url = 'https://lh3.googleusercontent.com/d/' || SPLIT_PART(featured_image_url, 'id=', 2)
      WHERE featured_image_url LIKE 'https://drive.google.com/uc?id=%'
      RETURNING id, featured_image_url
    `)
    console.log('Fixed drive uc?id= URLs:', r2.rows.length)

    console.log('Done!')
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}
fixUrls()
