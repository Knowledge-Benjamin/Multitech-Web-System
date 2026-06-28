import { asyncHandler } from '../utils/helpers.js'
import { dispatchEmail } from '../services/emailDispatcher.js'
import { getSetting } from '../utils/settingsService.js'

export const sendBroadcastEmail = asyncHandler(async (req, res) => {
  const { recipients, subject, text, html, cc, bcc, replyTo, attachments } = req.body

  if (!recipients || !recipients.length || !subject || (!text && !html)) {
    return res.status(400).json({ success: false, message: 'Recipients, subject, and text or html are required.' })
  }

  const normalizedRecipients = Array.isArray(recipients) ? recipients : [recipients]

  const payload = {
    to: normalizedRecipients,
    subject,
    text,
    html,
    cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
    bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
    replyTo,
    attachments
  }

  await dispatchEmail(payload)
  res.json({ success: true, message: 'Broadcast email sent successfully.' })
})

export const getEmailDefaultFrom = asyncHandler(async (req, res) => {
  const emailFrom = process.env.EMAIL_FROM_ADDRESS || 'no-reply@multitech.ac.ug'
  const emailName = process.env.EMAIL_FROM_NAME || 'Multitech Business School'
  const contactEmail = await getSetting('contact_destination_email')
  res.json({ success: true, data: { emailFrom, emailName, contactEmail } })
})
