import pool from '../config/database.js'
import initializeDatabase from '../config/migrate.js'

const seedDatabase = async () => {
  try {
    console.log('Initializing database schema...')
    await initializeDatabase()

    console.log('Seeding sample data...')

    // Seed programmes
    const programmes = [
      {
        name: 'Bachelor of Business Administration',
        type: 'undergraduate',
        level: 'degree',
        description: 'Comprehensive business education with focus on management and entrepreneurship',
        duration: '3 years',
        capacity: 50,
        tuition_fee: 3000
      },
      {
        name: 'Master of Business Administration',
        type: 'postgraduate',
        level: 'masters',
        description: 'Advanced business studies for professionals seeking career advancement',
        duration: '2 years',
        capacity: 30,
        tuition_fee: 5000
      },
      {
        name: 'Diploma in Information Technology',
        type: 'diploma',
        level: 'diploma',
        description: 'Practical IT skills and systems development',
        duration: '2 years',
        capacity: 40,
        tuition_fee: 2000
      },
      {
        name: 'Professional Accounting Certification',
        type: 'professional',
        level: 'certificate',
        description: 'Industry-recognized accounting and finance certification',
        duration: '1 year',
        capacity: 25,
        tuition_fee: 1500
      }
    ]

    for (const programme of programmes) {
      await pool.query(
        `INSERT INTO programmes (name, type, level, description, duration, capacity, tuition_fee, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
         ON CONFLICT DO NOTHING`,
        [programme.name, programme.type, programme.level, programme.description, programme.duration, programme.capacity, programme.tuition_fee]
      )
    }

    // Seed announcements
    const announcements = [
      {
        title: 'Welcome to Multitech Business School',
        content: 'We are excited to welcome new and returning students to our institution.',
        campus: 'Kampala',
        published: true
      },
      {
        title: 'Application Deadline Extended',
        content: 'The application deadline for the next intake has been extended to the end of this month.',
        campus: 'Kampala',
        published: true
      }
    ]

    for (const announcement of announcements) {
      await pool.query(
        `INSERT INTO announcements (title, content, campus, published, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT DO NOTHING`,
        [announcement.title, announcement.content, announcement.campus, announcement.published]
      )
    }

    console.log('Database seeded successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Seeding error:', error)
    process.exit(1)
  }
}

seedDatabase()
