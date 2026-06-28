import PDFDocument from 'pdfkit'

export const generateApplicationAcknowledgementPdf = async ({
  referenceNumber,
  fullName,
  programmeName,
  applicationDate,
  email,
  phone,
  loginEmail,
  loginPassword,
  status
}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', (err) => reject(err))

    doc.fontSize(20).text('Application Receipt', { align: 'center' })
    doc.moveDown(1)

    doc.fontSize(12).fillColor('#333')
    doc.text(`Date: ${applicationDate || new Date().toLocaleDateString()}`)
    doc.text(`Reference Number: ${referenceNumber}`)
    doc.text(`Applicant: ${fullName}`)
    doc.text(`Programme: ${programmeName}`)
    doc.text(`Application Status: ${status || 'pending'}`)
    doc.moveDown(1)

    doc.fontSize(12).text('Contact Information', { underline: true })
    doc.moveDown(0.5)
    doc.text(`Email: ${email}`)
    doc.text(`Phone: ${phone || 'N/A'}`)
    doc.moveDown(1)

    doc.fontSize(12).text('Login Details', { underline: true })
    doc.moveDown(0.5)
    doc.text(`Login email: ${loginEmail}`)
    doc.text(`Password: ${loginPassword}`)
    doc.moveDown(1)

    doc.fontSize(12).text('Thank you for submitting your application to Multitech Business School.')
    doc.text('Our admissions team will review your submission and contact you with the next steps. Please keep this receipt for your records.')
    doc.moveDown(1)

    doc.fontSize(10).fillColor('#555').text('If you have any questions, reply to this email or visit our admissions portal.', {
      align: 'left'
    })

    doc.end()
  })
}
