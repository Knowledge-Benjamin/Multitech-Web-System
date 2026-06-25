import pool from '../config/database.js'
import initializeDatabase from '../config/migrate.js'

const seedPublishedSection = async () => {
  try {
    console.log('Initializing database schema...')
    await initializeDatabase()

    console.log('Inserting a published about section...')
    await pool.query(
      `INSERT INTO about_sections (title, slug, description, content, status, display_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      ['Published Test Section', 'published-test-section', 'A test published section added by script.', 'This section should appear on the public About page.', 'published', 1]
    )

    const allRes = await pool.query('SELECT id, title, slug, description, content, status, display_order FROM about_sections ORDER BY id ASC')
    console.log(`\nAll sections (${allRes.rows.length}):`)
    console.log(JSON.stringify(allRes.rows, null, 2))

    const publishedRes = await pool.query("SELECT id, title, slug, description, content, status, display_order FROM about_sections WHERE status = 'published' ORDER BY display_order ASC, updated_at DESC")
    console.log(`\nPublished sections (${publishedRes.rows.length}):`)
    console.log(JSON.stringify(publishedRes.rows, null, 2))
  } catch (error) {
    console.error('Seed error:', error)
  } finally {
    await pool.end()
  }
}

seedPublishedSection()
