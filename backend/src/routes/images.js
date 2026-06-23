import express from 'express'
import { google } from 'googleapis'
import { getAuthClient } from '../utils/googleDriveService.js'

const router = express.Router()

router.get('/:fileId', async (req, res) => {
  try {
    const authClient = await getAuthClient()
    const drive = google.drive({ version: 'v3', auth: authClient })
    
    const fileId = req.params.fileId
    const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' })
    
    // Pass headers from Google to the client (Content-Type, etc.)
    res.set('Content-Type', response.headers['content-type'])
    res.set('Cache-Control', 'public, max-age=86400') // Cache for 24 hours
    
    response.data
      .on('end', () => {})
      .on('error', err => {
        console.error('Error streaming image:', err)
        if (!res.headersSent) {
          res.status(500).send('Error streaming image')
        }
      })
      .pipe(res)
  } catch (error) {
    console.error('Image proxy error:', error.message)
    if (!res.headersSent) {
      res.status(404).send('Image not found')
    }
  }
})

export default router
