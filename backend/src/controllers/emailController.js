import { asyncHandler } from '../utils/helpers.js'
import { getSetting, upsertSetting } from '../utils/settingsService.js'
import {
  saveContactMessage,
  queueContactMessageDelivery,
  queueContactAutoReply,
  queryContactMessages,
  getContactMessageById,
  markContactMessageRead,
  sendContactReply
} from '../services/contactMessageService.js'

export const sendContactMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message, pageUrl } = req.body

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, subject and message are required.' })
  }

  const destinationEmail = await getSetting('contact_destination_email')
  const savedMessage = await saveContactMessage({
    sender_name: name,
    sender_email: email,
    subject,
    message,
    page_url: pageUrl,
    destination_email: destinationEmail || process.env.EMAIL_FROM_ADDRESS || 'inquiries@multitech.ac.ug'
  })

  queueContactMessageDelivery(savedMessage)
  queueContactAutoReply(savedMessage)

  res.json({ success: true, message: 'Your message has been received and queued for delivery. You will receive an automated confirmation shortly.' })
})

export const getEmailSettings = asyncHandler(async (req, res) => {
  const contactEmail = await getSetting('contact_destination_email')
  const acknowledgementTemplate = await getSetting('application_acknowledgement_template')
  res.json({
    success: true,
    data: {
      contact_destination_email: contactEmail,
      application_acknowledgement_template: acknowledgementTemplate
    }
  })
})

export const updateEmailSettings = asyncHandler(async (req, res) => {
  const { contact_destination_email, application_acknowledgement_template } = req.body

  if (contact_destination_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_destination_email)) {
    return res.status(400).json({ success: false, message: 'A valid contact destination email is required.' })
  }

  if (contact_destination_email) {
    await upsertSetting('contact_destination_email', contact_destination_email)
  }

  if (typeof application_acknowledgement_template !== 'undefined') {
    await upsertSetting('application_acknowledgement_template', application_acknowledgement_template)
  }

  res.json({ success: true, message: 'Email settings updated successfully.' })
})

export const getEmailMessages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 20
  const status = req.query.status || ''
  const search = req.query.search || ''

  const result = await queryContactMessages({ page, limit, status, search })
  res.json({ success: true, data: result })
})

export const getEmailMessage = asyncHandler(async (req, res) => {
  const message = await getContactMessageById(req.params.id)

  if (!message) {
    return res.status(404).json({ success: false, message: 'Message not found.' })
  }

  res.json({ success: true, data: message })
})

export const markEmailMessageRead = asyncHandler(async (req, res) => {
  const message = await markContactMessageRead(req.params.id)

  if (!message) {
    return res.status(404).json({ success: false, message: 'Message not found.' })
  }

  res.json({ success: true, data: message })
})

export const replyToEmailMessage = asyncHandler(async (req, res) => {
  const { reply } = req.body

  if (!reply || !reply.trim()) {
    return res.status(400).json({ success: false, message: 'Reply text is required.' })
  }

  const message = await sendContactReply(req.params.id, reply, req.admin)
  res.json({ success: true, data: message, message: 'Reply sent successfully.' })
})
