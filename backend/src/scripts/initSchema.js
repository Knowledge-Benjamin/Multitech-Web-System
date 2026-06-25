import initializeDatabase from '../config/migrate.js'

const run = async () => {
  try {
    console.log('Running initializeDatabase migration...')
    await initializeDatabase()
    console.log('Schema initialized successfully.')
    process.exit(0)
  } catch (err) {
    console.error('Failed to run initializeDatabase:', err)
    process.exit(1)
  }
}

run()
