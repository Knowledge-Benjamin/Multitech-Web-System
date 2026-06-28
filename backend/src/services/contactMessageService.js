import pool from '../config/database.js'
import { buildEmailMessage, sendEmail } from '../utils/emailService.js'
import { renderContactEmail, renderAdminReplyEmail, renderAutoReplyEmail } from '../utils/emailTemplates.js'
import { logActivity } from './adminActivityService.js'

export const saveContactMessage = async ({ sender_name, sender_email, subject, message, page_url, destination_email }) => {
  const result = await pool.query(
    `INSERT INTO email_messages (sender_name, sender_email, subject, message, page_url, destination_email, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
     RETURNING *`,
    [sender_name, sender_email, subject, message, page_url, destination_email]
  )

  return result.rows[0]
}

export const queueContactMessageDelivery = async (messageRecord) => {
  if (!messageRecord || !messageRecord.id) {
    throw new Error('Invalid message record')
  }

  // Async fire-and-forget delivery; errors are recorded separately
  process.nextTick(async () => {
    try {
      const body = renderContactEmail({
        name: messageRecord.sender_name,
        email: messageRecord.sender_email,
        subject: messageRecord.subject,
        message: messageRecord.message,
        pageUrl: messageRecord.page_url
      })

      const email = await buildEmailMessage({
        to: messageRecord.destination_email,
        subject: body.subject,
        text: body.text,
        html: body.html,
        replyTo: messageRecord.sender_email
      })

      await sendEmail(email)
      await pool.query(
        `UPDATE email_messages SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [messageRecord.id]
      )
    } catch (error) {
      await pool.query(
        `UPDATE email_messages SET status = 'failed', delivery_error_message = $1, updated_at = NOW() WHERE id = $2`,
        [error.message || String(error), messageRecord.id]
      )
    }
  })
}

export const sendContactAutoReply = async (messageRecord) => {
  if (!messageRecord || !messageRecord.id || !messageRecord.sender_email) {
    return
  }

  const normalizedSender = messageRecord.sender_email.trim().toLowerCase()
  const systemAddress = (process.env.EMAIL_FROM_ADDRESS || 'no-reply@multitech.ac.ug').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedSender)) {
    return
  }

  if (normalizedSender === systemAddress || normalizedSender.includes('no-reply') || normalizedSender.includes('noreply')) {
    return
  }

  const existing = await pool.query(
    `SELECT auto_reply_status FROM email_messages WHERE id = $1`,
    [messageRecord.id]
  )

  if (existing.rows[0]?.auto_reply_status && existing.rows[0].auto_reply_status !== 'pending') {
    return
  }

  const emailData = renderAutoReplyEmail({ name: messageRecord.sender_name })

  const email = await buildEmailMessage({
    to: messageRecord.sender_email,
    subject: emailData.subject,
    text: emailData.text,
    html: emailData.html,
    replyTo: messageRecord.destination_email || systemAddress
  })

  try {
    await sendEmail(email)
    await pool.query(
      `UPDATE email_messages SET auto_reply_status = 'sent', auto_reply_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [messageRecord.id]
    )
  } catch (error) {
    await pool.query(
      `UPDATE email_messages SET auto_reply_status = 'failed', auto_reply_error_message = $1, updated_at = NOW() WHERE id = $2`,
      [error.message || String(error), messageRecord.id]
    )
  }
}

export const queueContactAutoReply = async (messageRecord) => {
  process.nextTick(async () => {
    await sendContactAutoReply(messageRecord)
  })
}

export const queryContactMessages = async ({ page = 1, limit = 20, status, search }) => {
  const offset = (page - 1) * limit
  const params = []
  const filters = []

  if (status) {
    params.push(status)
    filters.push(`status = $${params.length}`)
  }

  if (search) {
    params.push(`%${search.toLowerCase()}%`)
    filters.push(`LOWER(sender_name || ' ' || sender_email || ' ' || subject || ' ' || message) LIKE $${params.length}`)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM email_messages ${whereClause}`,
    params
  )
  const total = Number(countResult.rows[0].total)

  params.push(limit)
  params.push(offset)

  const result = await pool.query(
    `SELECT id, sender_name, sender_email, subject, message, page_url, destination_email, status, is_read, reply_status, admin_reply, admin_replied_at, replied_by, sent_at, delivery_error_message, reply_error_message, auto_reply_status, auto_reply_error_message, auto_reply_sent_at, created_at, updated_at
     FROM email_messages
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1}
     OFFSET $${params.length}`,
    params
  )

  return { total, messages: result.rows }
}

export const listContactMessages = async () => {
  const result = await pool.query(
    `SELECT id, sender_name, sender_email, subject, message, page_url, destination_email, status, is_read, reply_status, admin_reply, admin_replied_at, replied_by, sent_at, delivery_error_message, reply_error_message, auto_reply_status, auto_reply_error_message, auto_reply_sent_at, created_at, updated_at
     FROM email_messages
     ORDER BY created_at DESC`
  )

  return result.rows
}

export const getContactMessageById = async (id) => {
  const result = await pool.query(
    `SELECT id, sender_name, sender_email, subject, message, page_url, destination_email, status, is_read, reply_status, admin_reply, reply_error_message, auto_reply_status, auto_reply_error_message, auto_reply_sent_at, admin_replied_at, replied_by, sent_at, delivery_error_message, created_at, updated_at
     FROM email_messages
     WHERE id = $1`,
    [id]
  )

  return result.rows[0] || null
}

export const markContactMessageRead = async (id) => {
  const result = await pool.query(
    `UPDATE email_messages SET is_read = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  )
  return result.rows[0] || null
}

export const sendContactReply = async (id, replyText, admin) => {
  const message = await getContactMessageById(id)
  if (!message) {
    throw new Error('Message not found')
  }

  const emailData = renderAdminReplyEmail({
    senderName: message.sender_name,
    originalSubject: message.subject,
    originalMessage: message.message,
    replyText,
    adminName: admin?.username || 'Admin'
  })

  const email = await buildEmailMessage({
    to: message.sender_email,
    subject: emailData.subject,
    text: emailData.text,
    html: emailData.html,
    replyTo: process.env.EMAIL_FROM_ADDRESS
  })

  let replyResult = { reply_status: 'sent' }
  try {
    await sendEmail(email)
    await pool.query(
      `UPDATE email_messages SET admin_reply = $1, reply_status = 'sent', admin_replied_at = NOW(), replied_by = $2, updated_at = NOW() WHERE id = $3`,
      [replyText, admin?.id || null, id]
    )
  } catch (error) {
    replyResult.reply_status = 'failed'
    await pool.query(
      `UPDATE email_messages SET admin_reply = $1, reply_status = 'failed', reply_error_message = $2, updated_at = NOW() WHERE id = $3`,
      [replyText, error.message || String(error), id]
    )
  }

  logActivity(admin?.id, 'reply_contact_message', 'email_messages', id, `Reply status: ${replyResult.reply_status}`)
  return getContactMessageById(id)
}
