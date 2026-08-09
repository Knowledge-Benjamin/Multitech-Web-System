export const DEFAULT_APPLICATION_ACK_TEMPLATE = `Dear {{name}},

Thank you for submitting your application to Multitech Business School for the {{intakeName}} intake.

Your application reference is {{applicationReference}}.

**Important: Application Fee Payment**
Please pay the application fee of {{applicationFee}} to proceed with your application review.
Payment instructions: 
1. Airtel Money: Dial *185# -> Pay Bill -> URA -> ... (Use reference {{applicationReference}})
2. MTN Mobile Money: Dial *165# -> ...
(Please refer to the website for full payment details).

Once paid, the admissions team will review your choices:
{{choicesList}}

Application status: {{status}}

You can sign in to track your application with the details below:
Login email: {{loginEmail}}
Password: {{loginPassword}}

If you have questions, please reply to this email or contact our admissions team.

Best regards,
Multitech Business School Admissions Team`

const renderTemplate = (template, values) => {
  const body = template && template.trim() ? template : DEFAULT_APPLICATION_ACK_TEMPLATE
  return body.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    return values[key] != null ? values[key] : ''
  })
}

// Escape user-controlled HTML characters to prevent XSS in email bodies
const escapeHtml = (str) => {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

const htmlify = (text) => {
  const escaped = escapeHtml(text)
  return escaped.replace(/\r?\n/g, '<br/>')
}

const textify = (html) => {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
}

export const renderContactEmail = ({ name, email, subject, message, pageUrl }) => {
  // Plain-text version uses raw values (no HTML context)
  const renderedSubject = subject || `New contact request from ${name}`
  const plainText = `New contact form message:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage:\n${message}\n\nPage: ${pageUrl || 'Home / Contact Us'}`

  // HTML version — ALL user values must be escaped before interpolation
  const safeName    = escapeHtml(name)
  const safeEmail   = escapeHtml(email)
  const safeSubject = escapeHtml(subject)
  const safeMessage = escapeHtml(message)
  const safePageUrl = escapeHtml(pageUrl || 'Home / Contact Us')

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
      <h2>New contact request</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Subject:</strong> ${safeSubject}</p>
      <p><strong>Message:</strong></p>
      <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; white-space: pre-wrap;">${safeMessage}</div>
      <p style="margin-top: 1rem; color: #555;">Page: ${safePageUrl}</p>
    </div>
  `

  return { subject: renderedSubject, text: plainText, html }
}

export const renderApplicationAcknowledgementEmail = ({ template, name, applicationReference, intakeName, applicationFee, choicesList, status, loginEmail, loginPassword, applicationDate, email, phone }) => {
  const rendered = renderTemplate(template, {
    name,
    applicationReference,
    intakeName,
    applicationFee,
    choicesList,
    status,
    loginEmail,
    loginPassword,
    applicationDate,
    email,
    phone
  })

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
      <div>${htmlify(rendered)}</div>
    </div>
  `

  return {
    subject: `Application received: ${applicationReference}`,
    text: textify(rendered),
    html
  }
}

export const renderApplicationStatusEmail = ({ name, applicationReference, status, note }) => {
  const safeName      = escapeHtml(name)
  const safeRef       = escapeHtml(applicationReference)
  const safeStatus    = escapeHtml(status)
  const safeNote      = escapeHtml(note)

  const subject = `Your application status has changed to ${status}`
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
      <h2>Application status update</h2>
      <p>Hi ${safeName},</p>
      <p>Your application <strong>${safeRef}</strong> is now <strong>${safeStatus}</strong>.</p>
      ${note ? `<p><strong>Note from admissions:</strong></p><div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa;">${safeNote}</div>` : ''}
      <p>If you have any questions, please reply to this email or visit the admissions portal.</p>
    </div>
  `
  const text = `Hi ${name},\n\nYour application ${applicationReference} is now ${status}.\n\n${note ? `Note from admissions:\n${note}\n\n` : ''}If you have any questions, please reply to this email or visit the admissions portal.`

  return { subject, text, html }
}

export const renderAdminReplyEmail = ({ senderName, originalSubject, originalMessage, replyText, adminName }) => {
  const safeSenderName      = escapeHtml(senderName)
  const safeOriginalSubject = escapeHtml(originalSubject)
  const safeOriginalMessage = escapeHtml(originalMessage)
  const safeReplyText       = escapeHtml(replyText)
  const safeAdminName       = escapeHtml(adminName || 'Admissions Team')

  const subject = `Re: ${originalSubject}`
  const text = `Hi ${senderName},\n\n${replyText}\n\n--- Original message ---\n${originalMessage}`
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
      <p>Hi ${safeSenderName},</p>
      <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #f9fafb; white-space: pre-wrap;">${safeReplyText}</div>
      <p>Best regards,<br/>${safeAdminName}</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 1.5rem 0;" />
      <p><strong>Original message:</strong></p>
      <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff; white-space: pre-wrap;">${safeOriginalMessage}</div>
    </div>
  `

  return { subject, text, html }
}

export const renderAutoReplyEmail = ({ name }) => {
  const safeName = escapeHtml(name || 'there')

  const subject = 'Thank you for contacting Multitech Business School'
  const text = `Hi ${name || 'there'},\n\nThank you for reaching out to Multitech Business School. We have received your message and our team will review it shortly. This is an automated confirmation to let you know your inquiry is now in our queue.\n\nIf your message requires urgent attention, please reply to this email or visit our contact page again.\n\nBest regards,\nMultitech Business School`
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
      <p>Hi ${safeName},</p>
      <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #f9fafb;">
        Thank you for contacting Multitech Business School. We have received your message and our team will review it shortly.
      </div>
      <p>This is an automated confirmation to let you know your inquiry is now in our queue.</p>
      <p>If your message requires urgent attention, please reply to this email or visit our contact page again.</p>
      <p>Best regards,<br/>Multitech Business School</p>
    </div>
  `

  return { subject, text, html }
}
