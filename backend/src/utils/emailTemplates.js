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


export const renderAdmissionOfferEmail = ({
  name,
  applicationReference,
  programmeName,
  campusName,
  intakeName,
  studentNumber,
  portalUrl
}) => {
  const safeName = escapeHtml(name)
  const safeRef = escapeHtml(applicationReference)
  const safeProg = escapeHtml(programmeName)
  const safeCampus = escapeHtml(campusName || 'Main Campus')
  const safeIntake = escapeHtml(intakeName || 'Upcoming Intake')
  const url = portalUrl || 'https://multitech.ac.ug/login'

  const subject = `Congratulations! Offer of Admission - Multitech Business School (${safeProg})`
  const text = `Dear ${name},

Congratulations! We are delighted to inform you that you have been offered admission to Multitech Business School for:

Programme: ${programmeName}
Campus: ${campusName || 'Main Campus'}
Intake: ${intakeName || 'Upcoming Intake'}
Application Reference: ${applicationReference}

Your official Provisional Admission Offer Letter is attached to this email.

Next Steps:
Please sign into your Multitech Student Portal (${url}) to accept your offer, confirm your enrollment, and view your academic schedule.

Best regards,
Office of the Academic Registrar
Multitech Business School`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #2563eb;">
        <h1 style="color: #1e3a8a; font-size: 22px; margin: 0 0 6px 0;">MULTITECH BUSINESS SCHOOL</h1>
        <p style="color: #64748b; font-size: 13px; margin: 0;">Office of the Academic Registrar • Directorate of Admissions</p>
      </div>

      <h2 style="color: #16a34a; font-size: 20px; margin: 0 0 16px 0;">🎉 Congratulations, ${safeName}!</h2>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        We are thrilled to inform you that your application has been evaluated and approved. You have been granted a 
        <strong>Provisional Offer of Admission</strong> to study at Multitech Business School.
      </p>

      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Programme:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${safeProg}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Campus:</td>
            <td style="padding: 6px 0; color: #0f172a;">${safeCampus}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Intake:</td>
            <td style="padding: 6px 0; color: #0f172a;">${safeIntake}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Application Ref:</td>
            <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #2563eb;">${safeRef}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
        Your formal <strong>Admission Offer Letter (PDF)</strong> is attached to this email. Please log into your Student Portal to review the details and formally accept your offer.
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${url}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">
          Access Student Portal & Accept Offer &rarr;
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
        Multitech Business School • Plot 93 Sir Apollo Kaggwa Rd, Kampala, Uganda<br/>
        admissions@multitech.ac.ug • +256 414 532 755
      </p>
    </div>
  `

  return { subject, text, html }
}
