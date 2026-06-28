import { asyncHandler } from '../utils/helpers.js'
import { dispatchEmail } from '../services/emailDispatcher.js'
import { getSetting } from '../utils/settingsService.js'

const parseAddressList = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => item.trim()).filter(Boolean)
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const normalizeAttachments = (req) => {
  if (req.files && req.files.length) {
    return req.files.map((file) => ({
      filename: file.originalname,
      type: file.mimetype,
      content: file.buffer.toString('base64'),
      disposition: 'attachment'
    }))
  }

  if (req.body.attachments && Array.isArray(req.body.attachments)) {
    return req.body.attachments
  }

  return undefined
}

export const sendCustomAdminEmail = asyncHandler(async (req, res) => {
  const { recipients, subject, text, html, cc, bcc, replyTo } = req.body

  if (!recipients || !subject || (!text && !html)) {
    return res.status(400).json({ success: false, message: 'Recipients, subject and either text or html are required.' })
  }

  const to = parseAddressList(recipients)
  const ccList = parseAddressList(cc)
  const bccList = parseAddressList(bcc)
  const attachments = normalizeAttachments(req)

  if (!to.length) {
    return res.status(400).json({ success: false, message: 'At least one valid recipient email address is required.' })
  }

  await dispatchEmail({
    to,
    subject,
    text,
    html,
    cc: ccList.length ? ccList : undefined,
    bcc: bccList.length ? bccList : undefined,
    replyTo,
    attachments
  })

  res.json({ success: true, message: 'Custom email dispatched successfully.' })
})

export const getEmailDefaultFrom = asyncHandler(async (req, res) => {
  const emailFrom = process.env.EMAIL_FROM_ADDRESS || 'no-reply@multitech.ac.ug'
  const emailName = process.env.EMAIL_FROM_NAME || 'Multitech Business School'
  const contactEmail = await getSetting('contact_destination_email')
  res.json({ success: true, data: { emailFrom, emailName, contactEmail } })
})
