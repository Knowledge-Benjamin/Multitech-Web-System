import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()
const { Client } = pg

const testConnection = async () => {
  console.log('Testing connection to:', process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@'))
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Successfully connected!')
    const res = await client.query('SELECT NOW()')
    console.log('Server time:', res.rows[0])
    await client.end()
  } catch (err) {
    console.error('Connection failed:', err)
  }
}

testConnection()
