import { dispatchEmail } from './emailDispatcher.js'
import { renderContactEmail, renderApplicationStatusEmail } from '../utils/emailTemplates.js'
import { getSetting } from '../utils/settingsService.js'

const getContactRecipient = async () => {
  const configured = await getSetting('contact_destination_email')
  return configured || process.env.EMAIL_FROM_ADDRESS || 'inquiries@multitech.ac.ug'
}

export const sendContactFormEmail = async ({ name, email, subject, message, pageUrl, attachments }) => {
  const recipient = await getContactRecipient()
  const body = renderContactEmail({ name, email, subject, message, pageUrl })

  return await sendEmail({
    to: recipient,
    subject: body.subject,
    text: body.text,
    html: body.html,
    replyTo: email,
    attachments
  })
}

export const sendApplicationStatusUpdate = async ({ name, email, applicationReference, status, note, attachments }) => {
  const body = renderApplicationStatusEmail({ name, applicationReference, status, note })

  return await sendEmail({
    to: email,
    subject: body.subject,
    text: body.text,
    html: body.html,
    attachments
  })
}

export const sendCustomEmail = async ({ to, subject, text, html, cc, bcc, replyTo, attachments }) => {
  return await sendEmail({ to, subject, text, html, cc, bcc, replyTo, attachments })
}
