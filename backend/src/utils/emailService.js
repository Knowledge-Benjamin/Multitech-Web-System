import sgMail from '@sendgrid/mail'

const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Multitech Business School'
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'no-reply@multitech.ac.ug'

export const initEmailService = async () => {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is not configured')
  }
  sgMail.setApiKey(apiKey)
}

export const buildEmailMessage = async ({ to, subject, text, html, cc, bcc, replyTo, attachments }) => {
  if (!to || !subject || (!text && !html)) {
    throw new Error('Email message requires to, subject, and text or html')
  }

  const recipient = Array.isArray(to) ? to : [to]
  const message = {
    from: {
      name: EMAIL_FROM_NAME,
      email: EMAIL_FROM_ADDRESS
    },
    to: recipient,
    subject,
    text,
    html,
    replyTo: replyTo || EMAIL_FROM_ADDRESS
  }

  if (cc) message.cc = Array.isArray(cc) ? cc : [cc]
  if (bcc) message.bcc = Array.isArray(bcc) ? bcc : [bcc]
  if (attachments) message.attachments = attachments

  return message
}

export const sendEmail = async (message) => {
  if (!message) {
    throw new Error('Missing email message')
  }
  await initEmailService()
  const response = await sgMail.send(message)
  return response
}

export const sendRawEmail = async ({ to, subject, text, html, cc, bcc, replyTo, attachments }) => {
  const message = await buildEmailMessage({ to, subject, text, html, cc, bcc, replyTo, attachments })
  return await sendEmail(message)
}

export const sendTemplatedEmail = async ({ to, templateId, dynamicTemplateData, subject, cc, bcc, replyTo, attachments }) => {
  if (!to || !templateId) {
    throw new Error('Templated email requires to and templateId')
  }

  await initEmailService()

  const recipient = Array.isArray(to) ? to : [to]
  const message = {
    from: {
      name: EMAIL_FROM_NAME,
      email: EMAIL_FROM_ADDRESS
    },
    to: recipient,
    templateId,
    dynamicTemplateData,
    replyTo: replyTo || EMAIL_FROM_ADDRESS
  }

  if (cc) message.cc = Array.isArray(cc) ? cc : [cc]
  if (bcc) message.bcc = Array.isArray(bcc) ? bcc : [bcc]
  if (attachments) message.attachments = attachments

  return await sgMail.send(message)
}
