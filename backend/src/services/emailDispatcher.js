import { buildEmailMessage, sendEmail } from '../utils/emailService.js'

export const dispatchEmail = async ({
  to,
  subject,
  text,
  html,
  cc,
  bcc,
  replyTo,
  attachments
}) => {
  if (!to || !subject || (!text && !html)) {
    throw new Error('dispatchEmail requires to, subject, and text or html')
  }

  const message = await buildEmailMessage({
    to,
    subject,
    text,
    html,
    cc,
    bcc,
    replyTo,
    attachments
  })

  return await sendEmail(message)
}

export const queueEmailDispatch = async (payload) => {
  process.nextTick(async () => {
    try {
      await dispatchEmail(payload)
    } catch (error) {
      console.error('Queued email dispatch failed:', error)
    }
  })
}
