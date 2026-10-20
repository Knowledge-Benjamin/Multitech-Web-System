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

export const generateAdmissionLetterPdf = async ({
  studentNumber,
  referenceNumber,
  fullName,
  programmeName,
  campusName,
  intakeName,
  academicYear,
  admissionDate,
  tuitionFee,
  currency = 'UGX'
}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', (err) => reject(err))

    // Header Branding
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e3a8a').text('MULTITECH BUSINESS SCHOOL', { align: 'center' })
    doc.fontSize(10).font('Helvetica').fillColor('#64748b').text('Office of the Academic Registrar • Directorate of Admissions', { align: 'center' })
    doc.text('Main Campus: Plot 93, Sir Apollo Kaggwa Road, Kampala, Uganda', { align: 'center' })
    doc.text('Email: admissions@multitech.ac.ug | Tel: +256 414 532 755', { align: 'center' })
    doc.moveDown(0.7)

    // Divider
    doc.strokeColor('#2563eb').lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(1)

    // Metadata Row
    const dateStr = admissionDate || new Date().toLocaleDateString('en-UG', { dateStyle: 'long' })
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b')
    doc.text(`Date: ${dateStr}`, { align: 'right' })
    doc.text(`Reference No: ${referenceNumber || 'N/A'}`)
    doc.text(`Student No: ${studentNumber || 'ALLOCATED UPON ACCEPTANCE'}`)
    doc.moveDown(0.8)

    // Addressee
    doc.font('Helvetica-Bold').fontSize(11).text('TO:')
    doc.font('Helvetica').fontSize(11).text(fullName || 'Prospective Student')
    doc.moveDown(0.8)

    // Formal Subject
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#1e3a8a')
      .text(`OFFICIAL PROVISIONAL OFFER OF ADMISSION - ${intakeName ? intakeName.toUpperCase() : 'ACADEMIC YEAR'}`, {
        underline: true
      })
    doc.moveDown(0.8)

    // Body Paragraph 1
    doc.font('Helvetica').fontSize(10.5).fillColor('#334155').lineGap(3)
    doc.text(`Dear ${fullName},`)
    doc.moveDown(0.4)
    doc.text(
      'Following your formal application and subsequent evaluation by the Multitech Business School Admissions Board, ' +
      'we are pleased to offer you provisional admission to the following academic programme:'
    )
    doc.moveDown(0.6)

    // Admission Details Box
    const startY = doc.y
    doc.rect(50, startY, 495, 78).fillAndStroke('#f8fafc', '#cbd5e1')
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(10.5)
    doc.text(`Programme:`, 65, startY + 12)
    doc.font('Helvetica').text(programmeName || 'Academic Programme', 155, startY + 12)
    
    doc.font('Helvetica-Bold').text(`Campus:`, 65, startY + 32)
    doc.font('Helvetica').text(campusName || 'Main Campus', 155, startY + 32)

    doc.font('Helvetica-Bold').text(`Intake Term:`, 65, startY + 52)
    doc.font('Helvetica').text(`${intakeName || 'Current Intake'}${academicYear ? ` (${academicYear})` : ''}`, 155, startY + 52)

    doc.y = startY + 90
    doc.moveDown(0.5)

    // Financial Schedule
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a8a').text('Fee Structure & Financial Commitment:')
    doc.font('Helvetica').fontSize(10).fillColor('#334155').lineGap(2)
    if (tuitionFee && Number(tuitionFee) > 0) {
      doc.text(`• Tuition Fee: ${currency} ${Number(tuitionFee).toLocaleString()} per semester.`)
    } else {
      doc.text(`• Tuition Fee: As stipulated in the official programme schedule.`)
    }
    doc.text('• Functional Fees: Applicable statutory fees as determined by the Institute Governing Council.')
    doc.moveDown(0.6)

    // Acceptance Instructions
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a8a').text('Conditions & Next Steps for Enrollment:')
    doc.font('Helvetica').fontSize(10).fillColor('#334155').lineGap(2)
    doc.text('1. Log into your Multitech Student Portal to formally accept your offer and activate your student registration.')
    doc.text('2. Present your original academic transcripts, certificates, and valid national identification/passport to the Academic Registrar\'s office for physical verification upon reporting.')
    doc.text('3. This offer is provisional and subject to verification of your submitted credentials.')
    doc.moveDown(1.2)

    // Signature Area
    doc.font('Helvetica-Bold').fillColor('#0f172a').text('Office of the Academic Registrar')
    doc.font('Helvetica').fillColor('#64748b').text('Multitech Business School Admissions Board')

    doc.end()
  })
}
