import pool from '../config/database.js'
import initializeDatabase from '../config/migrate.js'

const inspectAboutSections = async () => {
  try {
    console.log('Ensuring database schema is initialized...')
    await initializeDatabase()

    const allRes = await pool.query('SELECT id, title, slug, description, content, status, display_order FROM about_sections ORDER BY id ASC')
    console.log(`\nAll sections (${allRes.rows.length}):`)
    console.log(JSON.stringify(allRes.rows, null, 2))

    const publishedRes = await pool.query("SELECT id, title, slug, description, content, status, display_order FROM about_sections WHERE status = 'published' ORDER BY display_order ASC, updated_at DESC")
    console.log(`\nPublished sections (${publishedRes.rows.length}):`)
    console.log(JSON.stringify(publishedRes.rows, null, 2))
  } catch (error) {
    console.error('Inspect error:', error)
  } finally {
    await pool.end()
  }
}

inspectAboutSections()
