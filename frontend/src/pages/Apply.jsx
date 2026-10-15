import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Check } from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import './Apply.css'

const STEPS = [
  'Intake & Choices',
  'Personal Information',
  'Contact Details',
  'Next of Kin',
  'Academic Background',
  'Funding & Documents',
  'Review & Submit'
]

export default function Apply() {
  const [searchParams] = useSearchParams()
  const initialProgrammeId = searchParams.get('programme') || ''

  const [currentStep, setCurrentStep] = useState(0)

  const { data: intakeRes, isLoading: loading } = useApiQuery('/intakes/active', 'activeIntakes')
  const intakes = intakeRes?.data || []

  // Form State
  const [formData, setFormData] = useState({
    intake_id: '',
    choices: [{ programme_intake_id: '', campus_id: '' }],

    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    marital_status: '',
    nationality: '',
    country_of_residence: '',
    id_number: '',
    religion: '',
    disability_disclosed: false,
    disability_details: '',
    phone: '',
    email: '',
    address: '',
    town: '',
    county: '',
    kin_name: '',
    kin_relationship: '',
    kin_phone: '',
    kin_email: '',
    kin_address: '',
    academic_history: [],
    funding_source: ''
  })

  // File State
  const [files, setFiles] = useState({
    passport_photo: null,
    national_id: [],
    academic_docs: []
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [successData, setSuccessData] = useState(null)

  const { data: progRes } = useApiQuery(
    formData.intake_id ? `/programmes?intake_id=${formData.intake_id}` : null,
    ['intakeProgrammes', formData.intake_id],
    { queryOptions: { enabled: !!formData.intake_id } }
  )
  const programmes = progRes?.data || []

  const { data: campRes, isLoading: loadingCampuses } = useApiQuery('/campuses', 'activeCampuses')
  const campuses = campRes?.data || []

  const handleChoiceChange = (index, field, value) => {
    const newChoices = [...formData.choices]
    newChoices[index] = { ...newChoices[index], [field]: value }
    // If programme changes, reset campus
    if (field === 'programme_intake_id') {
      newChoices[index].campus_id = ''
    }
    setFormData(prev => ({ ...prev, choices: newChoices }))
  }

  const addChoice = () => {
    if (formData.choices.length < 3) {
      setFormData(prev => ({ ...prev, choices: [...prev.choices, { programme_intake_id: '', campus_id: '' }] }))
    }
  }

  const removeChoice = (index) => {
    const newChoices = [...formData.choices]
    newChoices.splice(index, 1)
    setFormData(prev => ({ ...prev, choices: newChoices }))
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleFileChange = (e, fieldName) => {
    const selectedFiles = Array.from(e.target.files)
    if (fieldName === 'passport_photo') {
      setFiles(prev => ({ ...prev, [fieldName]: selectedFiles[0] }))
    } else {
      setFiles(prev => ({ ...prev, [fieldName]: selectedFiles }))
    }
  }

  const addAcademicRow = () => {
    setFormData(prev => ({
      ...prev,
      academic_history: [
        ...prev.academic_history, 
        { institution: '', qualification: '', year_completed: '', grade: '' }
      ]
    }))
  }

  const updateAcademicRow = (index, field, value) => {
    const newHistory = [...formData.academic_history]
    newHistory[index][field] = value
    setFormData(prev => ({ ...prev, academic_history: newHistory }))
  }

  const removeAcademicRow = (index) => {
    const newHistory = [...formData.academic_history]
    newHistory.splice(index, 1)
    setFormData(prev => ({ ...prev, academic_history: newHistory }))
  }

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    const form = new FormData()
    
    // Append text data
    Object.keys(formData).forEach(key => {
      if (key === 'academic_history') {
        form.append(key, JSON.stringify(formData[key]))
      } else if (key === 'choices') {
        const formattedChoices = formData.choices
          .filter(c => c.programme_intake_id && c.campus_id)
          .map((c, i) => ({ 
            programme_intake_id: parseInt(c.programme_intake_id), 
            campus_id: parseInt(c.campus_id),
            preference_order: i + 1 
          }))
        form.append(key, JSON.stringify(formattedChoices))
      } else {
        form.append(key, formData[key])
      }
    })

    // Append files
    if (files.passport_photo) {
      form.append('passport_photo', files.passport_photo)
    }
    files.national_id.forEach(file => {
      form.append('national_id', file)
    })
    files.academic_docs.forEach(file => {
      form.append('academic_docs', file)
    })

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/applications`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSuccessData(res.data.data)
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to submit application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (successData) {
    return (
      <div className="scope-apply apply-page success-container">
        <div className="success-card">
          <div className="success-icon"><Check size={36} strokeWidth={3} /></div>
          <h1>Application Submitted!</h1>
          <p>Thank you for applying to Multitech Business School. Your application has been received.</p>
          
          <div className="credentials-box">
            <h3>Your Application ID</h3>
            <div className="ref-number">{successData.reference_number}</div>
            
            <div className="creds">
              <h4>Action Required: Application Fee</h4>
              <p style={{color: '#d32f2f', fontWeight: 'bold'}}>Your application is pending payment. Please check your email for payment instructions.</p>
            </div>

            <div className="creds" style={{marginTop: '1rem'}}>
              <p>An account has been automatically created for you to track your application status.</p>
              <p><strong>Email:</strong> {successData.credentials.email}</p>
              <p><strong>Password:</strong> {successData.credentials.password}</p>
              <p className="note">Please save these credentials. You will be prompted to change your password on your first login.</p>
            </div>
          </div>
          
          <a href="/" className="button button-primary">Return to Home</a>
        </div>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        const selectedIntake = intakes.find(i => i.id.toString() === formData.intake_id)
        return (
          <div className="step-content">
            <h2>Select Intake & Choices</h2>
            
            <div className="form-group">
              <label>Which intake are you applying for? *</label>
              {loading ? (
                <p>Loading intakes...</p>
              ) : (
                <select name="intake_id" value={formData.intake_id} onChange={(e) => { handleInputChange(e); setFormData(p => ({...p, choices: [{ programme_intake_id: '', campus_id: '' }]})) }} required className="form-control">
                  <option value="">-- Select an Intake --</option>
                  {intakes.map(i => {
                    const hasIntlFee = i.international_fee && Number(i.international_fee) > 0
                    return (
                      <option key={i.id} value={i.id}>
                        {i.name} — Local: UGX {Number(i.application_fee).toLocaleString()}{hasIntlFee ? ` | Intl: $${Number(i.international_fee).toLocaleString()}` : ''}
                      </option>
                    )
                  })}
                </select>
              )}
            </div>

            {formData.intake_id && (
              <div className="choices-section">
                <h3>Your Programme Choices (Ranked in Order of Preference)</h3>
                <p className="text-sm text-gray-500 mb-4">You can select up to 3 choices for this intake.</p>
                
                {formData.choices.map((choice, index) => {
                  const selectedProg = programmes.find(p => p.programme_intake_id.toString() === choice.programme_intake_id)
                  const availableCampuses = selectedProg?.campus_ids || []
                  
                  return (
                  <div key={index} className="form-group choice-group" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                    <label style={{ fontWeight: 'bold' }}>Choice {index + 1} {index === 0 && '*'}</label>
                    <div className="choice-input-wrapper" style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                      <select 
                        value={choice.programme_intake_id} 
                        onChange={(e) => handleChoiceChange(index, 'programme_intake_id', e.target.value)} 
                        required={index === 0}
                        className="form-control"
                        style={{ flex: '1 1 250px' }}
                      >
                        <option value="">-- Select Programme --</option>
                        {programmes.map(p => (
                          <option key={p.id} value={p.programme_intake_id}>{p.name} ({p.level})</option>
                        ))}
                      </select>
                      
                      <select 
                        value={choice.campus_id} 
                        onChange={(e) => handleChoiceChange(index, 'campus_id', e.target.value)} 
                        required={index === 0 || !!choice.programme_intake_id}
                        disabled={!choice.programme_intake_id}
                        className="form-control"
                        style={{ flex: '1 1 200px' }}
                      >
                        <option value="">-- Select Campus --</option>
                        {campuses.filter(c => availableCampuses.includes(c.id)).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      
                      {index > 0 && (
                        <button type="button" onClick={() => removeChoice(index)} className="button button-danger">Remove</button>
                      )}
                    </div>
                    {choice.programme_intake_id && availableCampuses.length === 0 && (
                      <p style={{ color: '#d32f2f', fontSize: '0.85rem', marginTop: '5px' }}>This programme is not currently assigned to any campus.</p>
                    )}
                  </div>
                )})}

                {formData.choices.length < 3 && (
                  <button type="button" onClick={addChoice} className="button button-secondary mt-2">+ Add Another Choice</button>
                )}
              </div>
            )}

            <div className="step-actions">
              <button type="button" className="button button-primary" onClick={nextStep} disabled={!formData.intake_id || !formData.choices[0].programme_intake_id || !formData.choices[0].campus_id}>Next Step</button>
            </div>
          </div>
        )
      case 1:
        return (
          <div className="step-content">
            <h2>Personal Information</h2>
            <p className="step-desc">Please provide your legal names as they appear on your academic documents.</p>
            
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>Middle Name</label>
                <input type="text" name="middle_name" value={formData.middle_name} onChange={handleInputChange} className="form-control" />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} required className="form-control" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Gender *</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} required className="form-control">
                  <option value="">-- Select --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date of Birth *</label>
                <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>Marital Status</label>
                <select name="marital_status" value={formData.marital_status} onChange={handleInputChange} className="form-control">
                  <option value="">-- Select --</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nationality *</label>
                <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>Country of Residence *</label>
                <input type="text" name="country_of_residence" value={formData.country_of_residence} onChange={handleInputChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>National ID / Passport Number</label>
                <input type="text" name="id_number" value={formData.id_number} onChange={handleInputChange} className="form-control" />
              </div>
            </div>

            <div className="form-group">
              <label>Religion</label>
              <input type="text" name="religion" value={formData.religion} onChange={handleInputChange} className="form-control" />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" name="disability_disclosed" checked={formData.disability_disclosed} onChange={handleInputChange} />
                Do you have any disability you would like to disclose?
              </label>
            </div>

            {formData.disability_disclosed && (
              <div className="form-group">
                <label>Please provide details to help us accommodate you</label>
                <textarea name="disability_details" value={formData.disability_details} onChange={handleInputChange} className="form-control" rows="3"></textarea>
              </div>
            )}

            <div className="step-actions">
              <button type="button" className="button button-outline" onClick={prevStep}>Back</button>
              <button type="button" className="button button-primary" onClick={nextStep} 
                disabled={!formData.first_name || !formData.last_name || !formData.gender || !formData.date_of_birth || !formData.nationality || !formData.country_of_residence}>
                Next Step
              </button>
            </div>
          </div>
        )
      case 2:
        return (
          <div className="step-content">
            <h2>Contact Details</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Email Address *</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className="form-control" />
              </div>
            </div>
            <div className="form-group">
              <label>Physical Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Town / City</label>
                <input type="text" name="town" value={formData.town} onChange={handleInputChange} className="form-control" />
              </div>
              <div className="form-group">
                <label>County / State</label>
                <input type="text" name="county" value={formData.county} onChange={handleInputChange} className="form-control" />
              </div>
            </div>
            <div className="step-actions">
              <button type="button" className="button button-outline" onClick={prevStep}>Back</button>
              <button type="button" className="button button-primary" onClick={nextStep} disabled={!formData.email || !formData.phone}>Next Step</button>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="step-content">
            <h2>Next of Kin / Emergency Contact</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" name="kin_name" value={formData.kin_name} onChange={handleInputChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>Relationship *</label>
                <input type="text" name="kin_relationship" value={formData.kin_relationship} onChange={handleInputChange} required className="form-control" placeholder="e.g. Father, Mother, Spouse" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone Number *</label>
                <input type="tel" name="kin_phone" value={formData.kin_phone} onChange={handleInputChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" name="kin_email" value={formData.kin_email} onChange={handleInputChange} className="form-control" />
              </div>
            </div>
            <div className="form-group">
              <label>Physical Address</label>
              <input type="text" name="kin_address" value={formData.kin_address} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="step-actions">
              <button type="button" className="button button-outline" onClick={prevStep}>Back</button>
              <button type="button" className="button button-primary" onClick={nextStep} disabled={!formData.kin_name || !formData.kin_relationship || !formData.kin_phone}>Next Step</button>
            </div>
          </div>
        )
      case 4:
        return (
          <div className="step-content">
            <h2>Academic Background</h2>
            <p className="step-desc">List your previous educational qualifications starting with the most recent.</p>
            
            {formData.academic_history.map((edu, index) => (
              <div key={index} className="academic-row-card">
                <div className="form-row">
                  <div className="form-group">
                    <label>Institution Name</label>
                    <input type="text" value={edu.institution} onChange={(e) => updateAcademicRow(index, 'institution', e.target.value)} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Qualification Achieved</label>
                    <input type="text" value={edu.qualification} onChange={(e) => updateAcademicRow(index, 'qualification', e.target.value)} className="form-control" placeholder="e.g. UACE, UCE, Diploma" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Year Completed</label>
                    <input type="number" value={edu.year_completed} onChange={(e) => updateAcademicRow(index, 'year_completed', e.target.value)} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Grade / Classification</label>
                    <input type="text" value={edu.grade} onChange={(e) => updateAcademicRow(index, 'grade', e.target.value)} className="form-control" />
                  </div>
                </div>
                <button type="button" className="button button-danger-text" onClick={() => removeAcademicRow(index)}>Remove Entry</button>
              </div>
            ))}
            
            <button type="button" className="button button-outline" onClick={addAcademicRow}>+ Add Academic Record</button>

            <div className="step-actions">
              <button type="button" className="button button-outline" onClick={prevStep}>Back</button>
              <button type="button" className="button button-primary" onClick={nextStep}>Next Step</button>
            </div>
          </div>
        )
      case 5:
        return (
          <div className="step-content">
            <h2>Funding & Documents</h2>
            
            <div className="form-group">
              <label>Primary Source of Funding *</label>
              <select name="funding_source" value={formData.funding_source} onChange={handleInputChange} required className="form-control">
                <option value="">-- Select --</option>
                <option value="Self">Self / Family</option>
                <option value="Government Scholarship">Government Scholarship</option>
                <option value="Private Scholarship">Private Scholarship</option>
                <option value="Corporate Sponsor">Corporate Sponsor</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="documents-section">
              <h3>Document Uploads</h3>
              <p className="step-desc">Please provide clear copies of your documents. (Max 10MB per file)</p>

              <div className="form-group file-upload-group">
                <label>Passport Photo (Recent, clear face) *</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'passport_photo')} className="form-control" />
                {files.passport_photo && <span className="file-selected">Selected: {files.passport_photo.name}</span>}
              </div>

              <div className="form-group file-upload-group">
                <label>National ID / Passport (Front and Back)</label>
                <input type="file" multiple accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'national_id')} className="form-control" />
                {files.national_id.length > 0 && <span className="file-selected">{files.national_id.length} file(s) selected</span>}
              </div>

              <div className="form-group file-upload-group">
                <label>Academic Documents (Transcripts, Certificates) *</label>
                <input type="file" multiple accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'academic_docs')} className="form-control" />
                {files.academic_docs.length > 0 && <span className="file-selected">{files.academic_docs.length} file(s) selected</span>}
              </div>
            </div>

            <div className="step-actions">
              <button type="button" className="button button-outline" onClick={prevStep}>Back</button>
              <button type="button" className="button button-primary" onClick={nextStep} disabled={!formData.funding_source || !files.passport_photo || files.academic_docs.length === 0}>Next Step</button>
            </div>
          </div>
        )
      case 6: {
        const selectedIntake = intakes.find(i => i.id.toString() === formData.intake_id)
        const isUgandan = formData.nationality?.toLowerCase().includes('ugand')
        const hasIntlFee = selectedIntake?.international_fee && Number(selectedIntake.international_fee) > 0
        const applicableFee = (!isUgandan && hasIntlFee)
          ? { amount: Number(selectedIntake.international_fee), currency: 'USD', label: 'International Applicant Fee' }
          : { amount: Number(selectedIntake?.application_fee || 0), currency: 'UGX', label: 'Local Applicant Fee' }

        return (
          <div className="step-content">
            <h2>Review &amp; Submit</h2>
            <div className="review-section">
              <h3>Programme Choices</h3>
              {formData.choices.filter(c => c.programme_intake_id).map((choice, i) => {
                const prog = programmes.find(p => p.programme_intake_id.toString() === choice.programme_intake_id)
                const campus = campuses.find(c => c.id.toString() === choice.campus_id)
                return (
                  <p key={i} style={{marginBottom: '4px'}}>
                    <strong>Choice {i + 1}:</strong> {prog?.name || '—'} 
                    {campus && <span style={{color: '#555'}}> @ {campus.name}</span>}
                  </p>
                )
              })}
              
              <h3>Personal Details</h3>
              <p>Name: {formData.first_name} {formData.middle_name} {formData.last_name}</p>
              <p>Email: {formData.email}</p>
              <p>Phone: {formData.phone}</p>
              <p>Nationality: {formData.nationality}</p>
              
              <h3>Documents</h3>
              <p>Passport Photo: {files.passport_photo ? 'Provided' : 'Missing'}</p>
              <p>Academic Docs: {files.academic_docs.length} file(s)</p>

              <div style={{ marginTop: '20px', padding: '16px', background: isUgandan || !hasIntlFee ? '#f0fdf4' : '#eff6ff', border: `1px solid ${isUgandan || !hasIntlFee ? '#bbf7d0' : '#bfdbfe'}`, borderRadius: '10px' }}>
                <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '1rem' }}>Application Fee</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{applicableFee.label} ({isUgandan ? 'Ugandan Resident' : 'International Applicant'})</p>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: isUgandan || !hasIntlFee ? '#15803d' : '#1d4ed8', marginTop: '6px' }}>
                  {applicableFee.currency === 'USD' ? '$' : 'UGX '}{applicableFee.amount.toLocaleString()}
                  <span style={{ fontSize: '0.85rem', fontWeight: 400, marginLeft: '6px', color: '#64748b' }}>{applicableFee.currency}</span>
                </div>
                <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Payment instructions will be sent to your email after submission.</p>
              </div>
            </div>

            {submitError && <div className="error-message">{submitError}</div>}

            <div className="step-actions">
              <button type="button" className="button button-outline" onClick={prevStep} disabled={submitting}>Back</button>
              <button type="button" className="button button-accent" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        )
      }
      default:
        return null
    }
  }

  return (
    <div className="apply-page">
      <div className="apply-header">
        <h1>Student Application</h1>
        <p>Complete the form below to apply for a programme at Multitech Business School.</p>
      </div>

      <div className="container apply-container">
        <div className="wizard-progress">
          {STEPS.map((step, idx) => (
            <div key={idx} className={`progress-step ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}>
              <div className="step-number">{idx < currentStep ? <Check size={16} strokeWidth={3} /> : idx + 1}</div>
              <div className="step-label">{step}</div>
            </div>
          ))}
        </div>

        <div className="wizard-body">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}
