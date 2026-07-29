import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'
import { google } from 'googleapis'

const getOauth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GDRIVE_CLIENT_ID,
    process.env.GDRIVE_CLIENT_SECRET,
    process.env.GDRIVE_REDIRECT_URI
  )
}

export const getAuthUrl = asyncHandler(async (req, res) => {
  const oauth2Client = getOauth2Client()
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Ensures we always get a refresh token
    scope: ['https://www.googleapis.com/auth/drive']
  })
  // Prevent caching to ensure fresh auth URL on each request
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  res.json({ success: true, url })
})

export const handleCallback = asyncHandler(async (req, res) => {
  const { code } = req.query
  if (!code) {
    return res.redirect(`${process.env.CORS_ORIGIN}/admin/settings?gdrive=error`)
  }

  try {
    const oauth2Client = getOauth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    if (tokens.refresh_token) {
      await pool.query(
        `INSERT INTO settings (setting_key, setting_value, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
        ['gdrive_refresh_token', tokens.refresh_token]
      )
    }
    
    // Add no-cache headers to ensure this response is never cached
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    res.redirect(`${process.env.CORS_ORIGIN}/admin/settings?gdrive=connected`)
  } catch (error) {
    console.error('Error exchanging code for token:', error)
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    res.redirect(`${process.env.CORS_ORIGIN}/admin/settings?gdrive=error`)
  }
})

export const getStatus = asyncHandler(async (req, res) => {
  const result = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'gdrive_refresh_token'")
  const isConnected = result.rows.length > 0 && !!result.rows[0].setting_value
  // Prevent caching to ensure fresh status on each request
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  res.json({ success: true, connected: isConnected })
})

export const disconnectDrive = asyncHandler(async (req, res) => {
  await pool.query("DELETE FROM settings WHERE setting_key = 'gdrive_refresh_token'")
  // Prevent caching on disconnect response
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  res.json({ success: true, message: 'Google Drive disconnected' })
})
