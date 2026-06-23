import { google } from 'googleapis'
import { Readable } from 'stream'
import dotenv from 'dotenv'
import pool from '../config/database.js'

dotenv.config()

/**
 * Get an authenticated OAuth2 client asynchronously.
 * Fetches the refresh token from the database.
 */
export const getAuthClient = async () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GDRIVE_CLIENT_ID,
    process.env.GDRIVE_CLIENT_SECRET,
    process.env.GDRIVE_REDIRECT_URI
  )

  const result = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'gdrive_refresh_token'")
  if (result.rows.length === 0 || !result.rows[0].setting_value) {
    throw new Error('Google Drive is not authenticated. Admin must connect it in the dashboard.')
  }

  oauth2Client.setCredentials({
    refresh_token: result.rows[0].setting_value
  })

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await pool.query(
        "UPDATE settings SET setting_value = $1, updated_at = NOW() WHERE setting_key = 'gdrive_refresh_token'",
        [tokens.refresh_token]
      )
    }
  })

  return oauth2Client
}

const handleDriveError = async (error) => {
  const isAuthError = error?.code === 401 || error?.response?.status === 401 || error?.message?.includes('invalid_grant')
  if (isAuthError) {
    console.error('Google Drive Auth Error detected. Revoking stored token.')
    await pool.query("DELETE FROM settings WHERE setting_key = 'gdrive_refresh_token'")
    throw new Error('Google Drive authorization expired or revoked. Please reconnect in Admin Settings.')
  }
}

const ensureFolder = async (drive, subfolderName = null) => {
  let rootFolderId

  // 1. Check database for stored root folder ID
  try {
    const dbResult = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'gdrive_folder_id'")
    if (dbResult.rows.length > 0 && dbResult.rows[0].setting_value) {
      // Verify the folder still exists in Drive
      try {
        await drive.files.get({ fileId: dbResult.rows[0].setting_value, supportsAllDrives: true })
        rootFolderId = dbResult.rows[0].setting_value
      } catch (e) {
        console.log('Stored root folder ID not found in Drive, creating a new one...')
      }
    }
  } catch (err) {
    console.error('DB fetch error for folder ID:', err)
  }

  // If no root folder found, create it
  if (!rootFolderId) {
    try {
      const search = await drive.files.list({
        q: "name='Multitech Uploads' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id)'
      })
      
      if (search.data.files.length > 0) {
        rootFolderId = search.data.files[0].id
      } else {
        const folder = await drive.files.create({
          requestBody: { name: 'Multitech Uploads', mimeType: 'application/vnd.google-apps.folder' },
          fields: 'id'
        })
        
        await drive.permissions.create({
          fileId: folder.data.id,
          requestBody: { role: 'reader', type: 'anyone' }
        })
        rootFolderId = folder.data.id
      }

      await pool.query(
        `INSERT INTO settings (setting_key, setting_value, updated_at) 
         VALUES ('gdrive_folder_id', $1, NOW()) 
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
        [rootFolderId]
      )
    } catch (err) {
      console.error('Dynamic folder creation failed:', err)
      throw new Error('Could not create or find an upload folder in Google Drive')
    }
  }

  // 2. If subfolder requested, ensure it exists within rootFolder
  if (subfolderName) {
    try {
      const search = await drive.files.list({
        q: `name='${subfolderName}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)'
      })

      if (search.data.files.length > 0) {
        return search.data.files[0].id
      } else {
        const subfolder = await drive.files.create({
          requestBody: {
            name: subfolderName,
            parents: [rootFolderId],
            mimeType: 'application/vnd.google-apps.folder'
          },
          fields: 'id'
        })
        // Subfolders usually inherit permissions, but just in case:
        await drive.permissions.create({
          fileId: subfolder.data.id,
          requestBody: { role: 'reader', type: 'anyone' }
        })
        return subfolder.data.id
      }
    } catch (err) {
      console.error(`Subfolder ${subfolderName} creation failed:`, err)
      return rootFolderId // fallback to root
    }
  }

  return rootFolderId
}

export const uploadToDrive = async (fileObject, subfolderName = null) => {
  try {
    const authClient = await getAuthClient()
    const drive = google.drive({ version: 'v3', auth: authClient })

    const folderId = await ensureFolder(drive, subfolderName)

    const bufferStream = new Readable()
    bufferStream.push(fileObject.buffer)
    bufferStream.push(null)

    const fileMetadata = {
      name: `${Date.now()}_${fileObject.originalname}`,
      parents: [folderId]
    }

    const media = {
      mimeType: fileObject.mimetype,
      body: bufferStream
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
      supportsAllDrives: true
    })

    // Make the file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      }
    })

    return {
      fileId: response.data.id,
      url: `https://lh3.googleusercontent.com/d/${response.data.id}`
    }
  } catch (error) {
    await handleDriveError(error)
    console.error('Google Drive Upload Error Details:', error?.response?.data || error)
    throw new Error('Failed to upload image to Google Drive: ' + (error?.response?.data?.error?.message || error.message))
  }
}

export const deleteFromDrive = async (fileId) => {
  try {
    if (!fileId) return
    const authClient = await getAuthClient()
    const drive = google.drive({ version: 'v3', auth: authClient })
    await drive.files.delete({ fileId })
  } catch (error) {
    console.error('Google Drive Delete Error:', error)
    // Don't throw here so we can still delete the db record even if drive fails
  }
}

/**
 * Create a named folder inside a given parent folder.
 * Returns the new folder's Drive ID.
 */
export const createDriveFolder = async (drive, folderName, parentFolderId) => {
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    },
    fields: 'id'
  })
  // Make readable so admin can browse Drive links
  await drive.permissions.create({
    fileId: folder.data.id,
    requestBody: { role: 'reader', type: 'anyone' }
  })
  return folder.data.id
}

/**
 * Create the full folder hierarchy for a new application.
 * Returns an object with all four folder IDs.
 *
 * Structure:
 *   Applications/
 *     {referenceNumber}/
 *       passport_photo/
 *       identity_documents/
 *       academic_documents/
 */
export const createApplicationFolders = async (referenceNumber) => {
  const authClient = await getAuthClient()
  const drive = google.drive({ version: 'v3', auth: authClient })

  // Ensure the root 'Applications' folder exists under the Multitech root
  const applicationsFolderId = await ensureFolder(drive, 'Applications')

  // Create per-application root folder named after the Application ID
  const appFolderId = await createDriveFolder(drive, referenceNumber, applicationsFolderId)

  // Create the three subfolders in parallel
  const [passportFolderId, identityFolderId, academicFolderId] = await Promise.all([
    createDriveFolder(drive, 'passport_photo', appFolderId),
    createDriveFolder(drive, 'identity_documents', appFolderId),
    createDriveFolder(drive, 'academic_documents', appFolderId)
  ])

  return {
    drive_folder_id: appFolderId,
    passport_photo_folder_id: passportFolderId,
    identity_docs_folder_id: identityFolderId,
    academic_docs_folder_id: academicFolderId
  }
}

/**
 * Upload a file directly into a specific Drive folder ID.
 * Used for application documents where the target folder is already known.
 */
export const uploadToFolder = async (fileObject, folderId) => {
  try {
    const authClient = await getAuthClient()
    const drive = google.drive({ version: 'v3', auth: authClient })

    const bufferStream = new Readable()
    bufferStream.push(fileObject.buffer)
    bufferStream.push(null)

    const response = await drive.files.create({
      requestBody: {
        name: `${Date.now()}_${fileObject.originalname}`,
        parents: [folderId]
      },
      media: { mimeType: fileObject.mimetype, body: bufferStream },
      fields: 'id, webViewLink',
      supportsAllDrives: true
    })

    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: { role: 'reader', type: 'anyone' }
    })

    return {
      fileId: response.data.id,
      url: `https://lh3.googleusercontent.com/d/${response.data.id}`,
      webViewLink: response.data.webViewLink
    }
  } catch (error) {
    await handleDriveError(error)
    console.error('Drive uploadToFolder error:', error?.response?.data || error)
    throw new Error('Failed to upload file to Google Drive: ' + (error?.response?.data?.error?.message || error.message))
  }
}
