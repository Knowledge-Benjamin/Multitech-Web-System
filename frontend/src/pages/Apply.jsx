import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Check, UploadCloud, FileText, Image as ImageIcon, Trash2, Copy,
  ExternalLink, Download, AlertCircle, CheckCircle2, Sparkles,
  ArrowRight, ArrowLeft, Edit3, Clock, ShieldCheck, User, Mail,
  Phone, MapPin, School, CreditCard, ChevronRight
} from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import './Apply.css'

const STEPS = [
  { id: 'intake', title: 'Intake & Choices', icon: School, desc: 'Select intake term and programme preferences' },
  { id: 'personal', title: 'Personal Details', icon: User, desc: 'Legal name and personal identification' },
  { id: 'contact', title: 'Contact & Location', icon: MapPin, desc: 'Email address, telephone, and residence' },
  { id: 'kin', title: 'Next of Kin', icon: ShieldCheck, desc: 'Emergency contact or guardian details' },
  { id: 'academic', title: 'Academic History', icon: School, desc: 'Secondary or prior tertiary qualifications' },
  { id: 'documents', title: 'Documents & Funding', icon: UploadCloud, desc: 'Passport photograph, ID, and certificates' },
  { id: 'review', title: 'Review & Submit', icon: CheckCircle2, desc: 'Verify all details and complete submission' }
]

const DRAFT_KEY = 'mbs_applicant_draft_v2'

export default function Apply() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const initialProgrammeId = searchParams.get('programme') || ''
  const initialCampusId = searchParams.get('campus') || ''
  const initialIntakeId = searchParams.get('intake') || ''

  const [currentStep, setCurrentStep] = useState(0)
  const [maxStepReached, setMaxStepReached] = useState(0)
  const [draftRestored, setDraftRestored] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [downloadingSlip, setDownloadingSlip] = useState(false)

  // Errors state for inline validation
  const [errors, setErrors] = useState({})

  // Form State
  const [formData, setFormData] = useState({
    intake_id: initialIntakeId,
    choices: [{ programme_intake_id: '', campus_id: '' }],

    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    marital_status: '',
    nationality: 'Ugandan',
    country_of_residence: 'Uganda',
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
    academic_history: [
      { institution: '', qualification: '', year_completed: '', grade: '' }
    ],
    funding_source: ''
  })

  // File State & Previews
  const [files, setFiles] = useState({
    passport_photo: null,
    national_id: [],
    academic_docs: []
  })
  const [passportPreview, setPassportPreview] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [successData, setSuccessData] = useState(null)

  // API Queries
  const { data: intakeRes, isLoading: loadingIntakes } = useApiQuery('/intakes/active', 'activeIntakes')
  const intakes = intakeRes?.data || []

  const { data: progRes, isLoading: loadingProgrammes } = useApiQuery(
    formData.intake_id ? `/programmes?intake_id=${formData.intake_id}` : null,
    ['intakeProgrammes', formData.intake_id],
    { queryOptions: { enabled: !!formData.intake_id } }
  )
  const programmes = progRes?.data || []

  const { data: campRes } = useApiQuery('/campuses', 'activeCampuses')
  const campuses = campRes?.data || []

  // 1. Restore draft on initial load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.formData && !initialProgrammeId) {
          setFormData(prev => ({ ...prev, ...parsed.formData }))
          if (typeof parsed.currentStep === 'number') {
            setCurrentStep(parsed.currentStep)
            setMaxStepReached(Math.max(parsed.currentStep, parsed.maxStepReached || 0))
          }
          setDraftRestored(true)
        }
      }
    } catch (e) {
      console.warn('Could not restore draft:', e)
    }
  }, [])

  // 2. Auto-save draft on changes (excluding files)
  useEffect(() => {
    if (!successData) {
      const timer = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({
            formData,
            currentStep,
            maxStepReached,
            updatedAt: new Date().toISOString()
          }))
        } catch (e) {
          // ignore storage quota issues
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [formData, currentStep, maxStepReached, successData])

  // 3. Auto-select intake if only 1 active or query param provided
  useEffect(() => {
    if (intakes.length > 0 && !formData.intake_id) {
      if (initialIntakeId && intakes.some(i => i.id.toString() === initialIntakeId)) {
        setFormData(p => ({ ...p, intake_id: initialIntakeId }))
      } else if (intakes.length === 1) {
        setFormData(p => ({ ...p, intake_id: intakes[0].id.toString() }))
      }
    }
  }, [intakes, initialIntakeId])

  // 4. Pre-select programme from URL parameter (?programme=...)
  useEffect(() => {
    if (initialProgrammeId && programmes.length > 0) {
      const matched = programmes.find(
        p => p.id.toString() === initialProgrammeId || p.slug === initialProgrammeId
      )
      if (matched) {
        const availableCampuses = matched.campus_ids || []
        let selectedCampus = ''
        if (initialCampusId && availableCampuses.includes(parseInt(initialCampusId))) {
          selectedCampus = initialCampusId
        } else if (availableCampuses.length === 1) {
          selectedCampus = availableCampuses[0].toString()
        }

        setFormData(prev => {
          const newChoices = [...prev.choices]
          newChoices[0] = {
            programme_intake_id: matched.programme_intake_id.toString(),
            campus_id: selectedCampus
          }
          return { ...prev, choices: newChoices }
        })
      }
    }
  }, [programmes, initialProgrammeId, initialCampusId])

  // Clear draft
  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setDraftRestored(false)
    setFormData({
      intake_id: intakes[0]?.id ? intakes[0].id.toString() : '',
      choices: [{ programme_intake_id: '', campus_id: '' }],
      first_name: '',
      middle_name: '',
      last_name: '',
      gender: '',
      date_of_birth: '',
      marital_status: '',
      nationality: 'Ugandan',
      country_of_residence: 'Uganda',
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
      academic_history: [{ institution: '', qualification: '', year_completed: '', grade: '' }],
      funding_source: ''
    })
    setPassportPreview(null)
    setFiles({ passport_photo: null, national_id: [], academic_docs: [] })
    setCurrentStep(0)
    setMaxStepReached(0)
  }

  // Handle Form Inputs
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    const val = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: val }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  // Handle Programme Choices
  const handleChoiceChange = (index, field, value) => {
    const newChoices = [...formData.choices]
    newChoices[index] = { ...newChoices[index], [field]: value }
    if (field === 'programme_intake_id') {
      newChoices[index].campus_id = ''
      // If programme has only 1 campus, auto-select it
      const selectedProg = programmes.find(p => p.programme_intake_id.toString() === value)
      if (selectedProg?.campus_ids?.length === 1) {
        newChoices[index].campus_id = selectedProg.campus_ids[0].toString()
      }
    }
    setFormData(prev => ({ ...prev, choices: newChoices }))
    if (errors[`choice_${index}_${field}`]) {
      setErrors(prev => ({ ...prev, [`choice_${index}_${field}`]: null }))
    }
  }

  const addChoice = () => {
    if (formData.choices.length < 3) {
      setFormData(prev => ({
        ...prev,
        choices: [...prev.choices, { programme_intake_id: '', campus_id: '' }]
      }))
    }
  }

  const removeChoice = (index) => {
    const newChoices = [...formData.choices]
    newChoices.splice(index, 1)
    setFormData(prev => ({ ...prev, choices: newChoices }))
  }

  // File Handlers with Previews
  const handlePassportPhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert('Passport photograph must be smaller than 10MB.')
      return
    }
    setFiles(prev => ({ ...prev, passport_photo: file }))
    setPassportPreview(URL.createObjectURL(file))
    setErrors(prev => ({ ...prev, passport_photo: null }))
  }

  const handleMultipleFiles = (e, fieldName) => {
    const selected = Array.from(e.target.files || [])
    const oversized = selected.filter(f => f.size > 10 * 1024 * 1024)
    if (oversized.length > 0) {
      alert(`The following file(s) exceed 10MB and were not added: ${oversized.map(f => f.name).join(', ')}`)
    }
    const valid = selected.filter(f => f.size <= 10 * 1024 * 1024)
    setFiles(prev => ({
      ...prev,
      [fieldName]: [...prev[fieldName], ...valid]
    }))
    setErrors(prev => ({ ...prev, [fieldName]: null }))
  }

  const removeFile = (fieldName, index) => {
    setFiles(prev => {
      const updated = [...prev[fieldName]]
      updated.splice(index, 1)
      return { ...prev, [fieldName]: updated }
    })
  }

  // Academic History Rows
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

  // Step Validation
  const validateStep = (stepIndex) => {
    const errs = {}
    if (stepIndex === 0) {
      if (!formData.intake_id) errs.intake_id = 'Please select an intake session.'
      if (!formData.choices[0]?.programme_intake_id) {
        errs.choice_0_programme_intake_id = 'Please select your 1st choice programme.'
      }
      if (!formData.choices[0]?.campus_id) {
        errs.choice_0_campus_id = 'Please select a campus for your 1st choice.'
      }
    } else if (stepIndex === 1) {
      if (!formData.first_name.trim()) errs.first_name = 'First name is required.'
      if (!formData.last_name.trim()) errs.last_name = 'Last name is required.'
      if (!formData.gender) errs.gender = 'Please select your gender.'
      if (!formData.date_of_birth) errs.date_of_birth = 'Date of birth is required.'
      if (!formData.nationality.trim()) errs.nationality = 'Nationality is required.'
      if (!formData.country_of_residence.trim()) errs.country_of_residence = 'Country of residence is required.'
    } else if (stepIndex === 2) {
      if (!formData.email.trim()) {
        errs.email = 'Email address is required.'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errs.email = 'Please enter a valid email address.'
      }
      if (!formData.phone.trim()) {
        errs.phone = 'Phone number is required.'
      } else if (formData.phone.replace(/[^0-9]/g, '').length < 9) {
        errs.phone = 'Please enter a valid phone number (at least 9 digits).'
      }
    } else if (stepIndex === 3) {
      if (!formData.kin_name.trim()) errs.kin_name = 'Emergency contact / Kin name is required.'
      if (!formData.kin_relationship.trim()) errs.kin_relationship = 'Relationship is required (e.g. Parent, Guardian).'
      if (!formData.kin_phone.trim()) errs.kin_phone = 'Kin telephone number is required.'
    } else if (stepIndex === 5) {
      if (!formData.funding_source) errs.funding_source = 'Please select your primary source of funding.'
      if (!files.passport_photo) errs.passport_photo = 'A recent passport photograph is required.'
      if (files.academic_docs.length === 0) {
        errs.academic_docs = 'Please upload at least one academic certificate or transcript.'
      }
    }

    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      // Scroll to first invalid input
      const firstKey = Object.keys(errs)[0]
      const element = document.querySelector(`[name="${firstKey}"]`) || document.querySelector('.has-error')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return false
    }
    return true
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      const next = Math.min(currentStep + 1, STEPS.length - 1)
      setCurrentStep(next)
      setMaxStepReached(prev => Math.max(prev, next))
      window.scrollTo({ top: 180, behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
    window.scrollTo({ top: 180, behavior: 'smooth' })
  }

  const jumpToStep = (index) => {
    if (index <= maxStepReached) {
      setCurrentStep(index)
      window.scrollTo({ top: 180, behavior: 'smooth' })
    }
  }

  // Submit Application
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    const form = new FormData()

    Object.keys(formData).forEach(key => {
      if (key === 'academic_history') {
        const cleaned = formData.academic_history.filter(h => h.institution || h.qualification)
        form.append(key, JSON.stringify(cleaned))
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
        form.append(key, formData[key] ?? '')
      }
    })

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

      if (res.data.success) {
        setSuccessData(res.data.data)
        localStorage.removeItem(DRAFT_KEY)

        // Seamless one-click login session establishment
        if (res.data.data.token) {
          localStorage.setItem('studentToken', res.data.data.token)
        }
        if (res.data.data.student) {
          localStorage.setItem('studentUser', JSON.stringify(res.data.data.student))
        }
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to submit application. Please review your entries and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const handleDownloadApplicationSlip = async () => {
    if (!successData?.reference_number) return
    setDownloadingSlip(true)
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/applications/${successData.reference_number}/acknowledgement`,
        { responseType: 'blob' }
      )
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Application-Slip-${successData.reference_number}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Unable to download application slip right now. Your confirmation email contains a complete copy.')
    } finally {
      setDownloadingSlip(false)
    }
  }

  // -------------------------------------------------------------
  // SUCCESS SCREEN
  // -------------------------------------------------------------
  if (successData) {
    return (
      <div className="scope-apply apply-page success-container">
        <div className="success-card fade-in-section is-visible">
          <div className="success-icon-badge">
            <Check size={42} strokeWidth={3} />
          </div>

          <div className="success-celebration-pill">
            <Sparkles size={16} /> Official Submission Confirmed
          </div>

          <h1 className="success-title">Application Submitted!</h1>
          <p className="success-subtitle">
            Welcome to Multitech Business School, <strong>{successData.applicant_name}</strong>. Your formal application has been registered with the Academic Registrar.
          </p>

          <div className="ref-card">
            <div className="ref-label">Your Application Reference Number</div>
            <div className="ref-value-row">
              <span className="ref-code">{successData.reference_number}</span>
              <button
                type="button"
                onClick={() => handleCopy(successData.reference_number)}
                className="btn-copy"
                title="Copy Reference"
              >
                <Copy size={16} /> {copyFeedback ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="ref-hint">
              Save this reference number for all future inquiries and payment confirmation.
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="success-action-buttons">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="button button-primary button-lg"
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <span>Go to Your Applicant Portal</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={handleDownloadApplicationSlip}
              disabled={downloadingSlip}
              className="button button-outline button-lg"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Download size={18} />
              <span>{downloadingSlip ? 'Downloading...' : 'Download Application Slip (PDF)'}</span>
            </button>
          </div>

          {/* Credentials Box */}
          <div className="credentials-box">
            <h4>Application Portal Credentials</h4>
            <p className="text-sm text-muted">
              An applicant account has been provisioned so you can track admission progress, check clearance, and accept your offer:
            </p>
            <div className="credentials-grid">
              <div className="cred-item">
                <span className="cred-label">Login Email</span>
                <strong className="cred-val">{successData.credentials.email}</strong>
              </div>
              <div className="cred-item">
                <span className="cred-label">Initial Password</span>
                <strong className="cred-val cred-mono">{successData.credentials.password}</strong>
              </div>
            </div>
            <p className="cred-note">
              A formal acknowledgement email with your PDF summary has been dispatched to <strong>{successData.credentials.email}</strong>.
            </p>
          </div>

          {/* Next Steps Card */}
          <div className="next-steps-card">
            <h4>Next Steps: Application Fee Payment</h4>
            <p>
              Your application is currently pending payment verification. You may pay via <strong>MTN Mobile Money</strong>, <strong>Airtel Money</strong>, or at any <strong>Stanbic Bank</strong> or <strong>Centenary Bank</strong> branch.
            </p>
            <div className="steps-list">
              <div className="step-point">
                <span className="step-num">1</span>
                <span>Complete application fee payment referencing <strong>{successData.reference_number}</strong>.</span>
              </div>
              <div className="step-point">
                <span className="step-num">2</span>
                <span>The Admissions Board reviews your submitted certificates and programme preferences.</span>
              </div>
              <div className="step-point">
                <span className="step-num">3</span>
                <span>Upon approval, your Admission Letter is issued and accessible directly on your portal.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // STEP RENDERERS
  // -------------------------------------------------------------
  const renderStep = () => {
    switch (currentStep) {
      // Step 0: Intake & Programme Choices
      case 0:
        return (
          <div className="step-content fade-in-item">
            <div className="step-heading">
              <h2>Select Intake &amp; Programme Choices</h2>
              <p className="step-desc">
                Choose your intake session and rank up to three (3) programme choices in order of preference.
              </p>
            </div>

            <div className="form-group">
              <label>Intake Session *</label>
              {loadingIntakes ? (
                <div className="field-loading">Loading active intakes...</div>
              ) : (
                <select
                  name="intake_id"
                  value={formData.intake_id}
                  onChange={(e) => {
                    handleInputChange(e)
                    setFormData(p => ({
                      ...p,
                      choices: [{ programme_intake_id: '', campus_id: '' }]
                    }))
                  }}
                  className={`form-control ${errors.intake_id ? 'has-error' : ''}`}
                >
                  <option value="">-- Select an Intake --</option>
                  {intakes.map(i => {
                    const hasIntlFee = i.international_fee && Number(i.international_fee) > 0
                    return (
                      <option key={i.id} value={i.id}>
                        {i.name} — Local: UGX {Number(i.application_fee).toLocaleString()}
                        {hasIntlFee ? ` | Intl: $${Number(i.international_fee).toLocaleString()} USD` : ''}
                      </option>
                    )
                  })}
                </select>
              )}
              {errors.intake_id && <span className="field-error">{errors.intake_id}</span>}
            </div>

            {formData.intake_id && (
              <div className="choices-section">
                <div className="choices-header">
                  <h3>Ranked Programme Preferences</h3>
                  <span className="choices-badge">Max 3 Choices</span>
                </div>

                {formData.choices.map((choice, index) => {
                  const selectedProg = programmes.find(
                    p => p.programme_intake_id.toString() === choice.programme_intake_id
                  )
                  const availableCampuses = selectedProg?.campus_ids || []

                  return (
                    <div key={index} className="choice-card">
                      <div className="choice-header">
                        <span className="choice-rank-badge">
                          {index === 0 ? '1st Choice (Primary) *' : index === 1 ? '2nd Choice (Alternative)' : '3rd Choice (Alternative)'}
                        </span>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => removeChoice(index)}
                            className="btn-remove-choice"
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        )}
                      </div>

                      <div className="choice-inputs-grid">
                        <div className="form-group mb-0">
                          <label className="text-xs">Programme</label>
                          <select
                            value={choice.programme_intake_id}
                            onChange={(e) => handleChoiceChange(index, 'programme_intake_id', e.target.value)}
                            className={`form-control ${errors[`choice_${index}_programme_intake_id`] ? 'has-error' : ''}`}
                          >
                            <option value="">-- Select Programme --</option>
                            {programmes.map(p => (
                              <option key={p.id} value={p.programme_intake_id}>
                                {p.name} ({p.level})
                              </option>
                            ))}
                          </select>
                          {errors[`choice_${index}_programme_intake_id`] && (
                            <span className="field-error">{errors[`choice_${index}_programme_intake_id`]}</span>
                          )}
                        </div>

                        <div className="form-group mb-0">
                          <label className="text-xs">Campus</label>
                          <select
                            value={choice.campus_id}
                            onChange={(e) => handleChoiceChange(index, 'campus_id', e.target.value)}
                            disabled={!choice.programme_intake_id}
                            className={`form-control ${errors[`choice_${index}_campus_id`] ? 'has-error' : ''}`}
                          >
                            <option value="">-- Select Campus --</option>
                            {campuses
                              .filter(c => availableCampuses.includes(c.id))
                              .map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                          </select>
                          {errors[`choice_${index}_campus_id`] && (
                            <span className="field-error">{errors[`choice_${index}_campus_id`]}</span>
                          )}
                        </div>
                      </div>

                      {choice.programme_intake_id && availableCampuses.length === 0 && (
                        <p className="choice-warning">
                          <AlertCircle size={14} /> This programme is not currently assigned to any active campus.
                        </p>
                      )}
                    </div>
                  )
                })}

                {formData.choices.length < 3 && (
                  <button
                    type="button"
                    onClick={addChoice}
                    className="button button-secondary button-sm mt-3"
                  >
                    + Add Another Programme Choice
                  </button>
                )}
              </div>
            )}

            <div className="step-actions">
              <div></div>
              <button type="button" className="button button-primary" onClick={nextStep}>
                <span>Next: Personal Details</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )

      // Step 1: Personal Details
      case 1:
        return (
          <div className="step-content fade-in-item">
            <div className="step-heading">
              <h2>Personal Information</h2>
              <p className="step-desc">
                Please enter your legal names and identity details exactly as they appear on your academic certificates.
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="e.g. John"
                  className={`form-control ${errors.first_name ? 'has-error' : ''}`}
                />
                {errors.first_name && <span className="field-error">{errors.first_name}</span>}
              </div>
              <div className="form-group">
                <label>Middle Name</label>
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Baptist"
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Last / Surname *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Okello"
                  className={`form-control ${errors.last_name ? 'has-error' : ''}`}
                />
                {errors.last_name && <span className="field-error">{errors.last_name}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={`form-control ${errors.gender ? 'has-error' : ''}`}
                >
                  <option value="">-- Select Gender --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <span className="field-error">{errors.gender}</span>}
              </div>

              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  max="2012-12-31"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  className={`form-control ${errors.date_of_birth ? 'has-error' : ''}`}
                />
                {errors.date_of_birth && <span className="field-error">{errors.date_of_birth}</span>}
              </div>

              <div className="form-group">
                <label>Marital Status</label>
                <select
                  name="marital_status"
                  value={formData.marital_status}
                  onChange={handleInputChange}
                  className="form-control"
                >
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
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  placeholder="e.g. Ugandan, Kenyan, South Sudanese"
                  className={`form-control ${errors.nationality ? 'has-error' : ''}`}
                />
                {errors.nationality && <span className="field-error">{errors.nationality}</span>}
              </div>

              <div className="form-group">
                <label>Country of Residence *</label>
                <input
                  type="text"
                  name="country_of_residence"
                  value={formData.country_of_residence}
                  onChange={handleInputChange}
                  placeholder="e.g. Uganda"
                  className={`form-control ${errors.country_of_residence ? 'has-error' : ''}`}
                />
                {errors.country_of_residence && <span className="field-error">{errors.country_of_residence}</span>}
              </div>

              <div className="form-group">
                <label>National ID (NIN) / Passport No.</label>
                <input
                  type="text"
                  name="id_number"
                  value={formData.id_number}
                  onChange={handleInputChange}
                  placeholder="e.g. CM12345678ABCD"
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Religious Affiliation (Optional)</label>
                <input
                  type="text"
                  name="religion"
                  value={formData.religion}
                  onChange={handleInputChange}
                  placeholder="e.g. Christian, Muslim, etc."
                  className="form-control"
                />
              </div>
            </div>

            <div className="disability-box">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="disability_disclosed"
                  checked={formData.disability_disclosed}
                  onChange={handleInputChange}
                />
                <span>Do you have any disability or special accommodation needs you would like to disclose?</span>
              </label>

              {formData.disability_disclosed && (
                <div className="disability-details-input fade-in-item">
                  <label className="text-xs">Accommodation details:</label>
                  <textarea
                    name="disability_details"
                    value={formData.disability_details}
                    onChange={handleInputChange}
                    placeholder="Please specify any mobility, visual, auditory, or academic accommodation needs..."
                    className="form-control"
                    rows="3"
                  />
                </div>
              )}
            </div>

            <div className="step-actions">
              <button type="button" className="button button-outline" onClick={prevStep}>
                <ArrowLeft size={16} /> Back
              </button>
              <button type="button" className="button button-primary" onClick={nextStep}>
                <span>Next: Contact Details</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )

      // Step 2: Contact & Location
      case 2:
        return (
          <div className="step-content fade-in-item">
            <div className="step-heading">
              <h2>Contact Information &amp; Location</h2>
              <p className="step-desc">
                We will use this email and phone number to send your admission status, fee schedules, and student account details.
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email Address *</label>
                <div className="input-icon-wrapper">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="name@example.com"
                    className={`form-control has-icon ${errors.email ? 'has-error' : ''}`}
                  />
                </div>
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>Active Telephone Number *</label>
                <div className="input-icon-wrapper">
                  <Phone size={16} className="input-icon" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +256 700 000 000"
                    className={`form-control has-icon ${errors.phone ? 'has-error' : ''}`}
                  />
                </div>
                {errors.phone && <span className="field-error">{errors.phone}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Residential Physical Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="e.g. Plot 14, Kyadondo Road, Nakasero"
                className="form-control"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Town / City</label>
                <input
                  type="text"
                  name="town"
                  value={formData.town}
                  onChange={handleInputChange}
                  placeholder="e.g. Kampala"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>District / County / State</label>
                <input
                  type="text"
                  name="county"
                  value={formData.county}
                  onChange={handleInputChange}
                  placeholder="e.g. Wakiso / Central Region"
                  className="form-control"
                />
              </div>
            </div>

            <div className="step-actions">
              <button type="button" className="button button-outline" onClick={prevStep}>
                <ArrowLeft size={16} /> Back
              </button>
              <button type="button" className="button button-primary" onClick={nextStep}>
                <span>Next: Next of Kin</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )

      // Step 3: Next of Kin
      case 3:
        return (
          <div className="step-content fade-in-item">
            <div className="step-heading">
              <h2>Next of Kin / Emergency Contact</h2>
              <p className="step-desc">
                Provide details for a parent, legal guardian, or spouse who can be contacted in case of emergency.
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Full Legal Name *</label>
                <input
                  type="text"
                  name="kin_name"
                  value={formData.kin_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Sarah Namubiru"
                  className={`form-control ${errors.kin_name ? 'has-error' : ''}`}
                />
                {errors.kin_name && <span className="field-error">{errors.kin_name}</span>}
              </div>

              <div className="form-group">
                <label>Relationship *</label>
                <input
                  type="text"
                  name="kin_relationship"
                  value={formData.kin_relationship}
                  onChange={handleInputChange}
                  placeholder="e.g. Mother, Father, Guardian, Spouse"
                  className={`form-control ${errors.kin_relationship ? 'has-error' : ''}`}
                />
                {errors.kin_relationship && <span className="field-error">{errors.kin_relationship}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Telephone Number *</label>
                <div className="input-icon-wrapper">
                  <Phone size={16} className="input-icon" />
                  <input
                    type="tel"
                    name="kin_phone"
                    value={formData.kin_phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +256 772 000 000"
                    className={`form-control has-icon ${errors.kin_phone ? 'has-error' : ''}`}
                  />
                </div>
                {errors.kin_phone && <span className="field-error">{errors.kin_phone}</span>}
              </div>

              <div className="form-group">
                <label>Email Address (Optional)</label>
                <div className="input-icon-wrapper">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    name="kin_email"
                    value={formData.kin_email}
                    onChange={handleInputChange}
                    placeholder="kin@example.com"
                    className="form-control has-icon"
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Physical Address (Optional)</label>
              <input
                type="text"
                name="kin_address"
                value={formData.kin_address}
                onChange={handleInputChange}
                placeholder="e.g. Entebbe, Uganda"
                className="form-control"
              />
            </div>

            <div className="step-actions">
              <button type="button" className="button button-outline" onClick={prevStep}>
                <ArrowLeft size={16} /> Back
              </button>
              <button type="button" className="button button-primary" onClick={nextStep}>
                <span>Next: Academic History</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )

      // Step 4: Academic Background
      case 4:
        return (
          <div className="step-content fade-in-item">
            <div className="step-heading">
              <h2>Academic Background</h2>
              <p className="step-desc">
                List your previous educational qualifications starting with the most recent (e.g. UACE, UCE, Diploma, or Degree).
              </p>
            </div>

            {formData.academic_history.map((edu, index) => (
              <div key={index} className="academic-row-card">
                <div className="academic-row-header">
                  <span className="academic-card-num">Record #{index + 1}</span>
                  {formData.academic_history.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAcademicRow(index)}
                      className="btn-remove-academic"
                    >
                      <Trash2 size={14} /> Remove Entry
                    </button>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Institution / School Attended</label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => updateAcademicRow(index, 'institution', e.target.value)}
                      placeholder="e.g. Makerere College School"
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Qualification Awarded</label>
                    <input
                      type="text"
                      value={edu.qualification}
                      onChange={(e) => updateAcademicRow(index, 'qualification', e.target.value)}
                      placeholder="e.g. Uganda Advanced Certificate of Education (UACE)"
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Year Completed</label>
                    <input
                      type="number"
                      value={edu.year_completed}
                      onChange={(e) => updateAcademicRow(index, 'year_completed', e.target.value)}
                      placeholder="e.g. 2025"
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Grade / Division / Classification</label>
                    <input
                      type="text"
                      value={edu.grade}
                      onChange={(e) => updateAcademicRow(index, 'grade', e.target.value)}
                      placeholder="e.g. 18 Points / Division 1"
                      className="form-control"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addAcademicRow}
              className="button button-outline button-sm mb-4"
            >
              + Add Another Qualification
            </button>

            <div className="step-actions">
              <button type="button" className="button button-outline" onClick={prevStep}>
                <ArrowLeft size={16} /> Back
              </button>
              <button type="button" className="button button-primary" onClick={nextStep}>
                <span>Next: Documents &amp; Funding</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )

      // Step 5: Funding & Document Uploads
      case 5:
        return (
          <div className="step-content fade-in-item">
            <div className="step-heading">
              <h2>Funding &amp; Document Uploads</h2>
              <p className="step-desc">
                Upload clear scanned copies or clear photos of your required verification documents. (Max 10MB per file).
              </p>
            </div>

            <div className="form-group">
              <label>Primary Source of Tuition Funding *</label>
              <select
                name="funding_source"
                value={formData.funding_source}
                onChange={handleInputChange}
                className={`form-control ${errors.funding_source ? 'has-error' : ''}`}
              >
                <option value="">-- Select Source of Funding --</option>
                <option value="Self">Self / Family Sponsorship</option>
                <option value="Government Scholarship">Government Scholarship / Higher Education Loan</option>
                <option value="Private Scholarship">Private Foundation Scholarship</option>
                <option value="Corporate Sponsor">Corporate / Employer Sponsorship</option>
                <option value="Other">Other</option>
              </select>
              {errors.funding_source && <span className="field-error">{errors.funding_source}</span>}
            </div>

            <div className="documents-section">
              {/* Passport Photo */}
              <div className="upload-block">
                <label className="upload-label">
                  <span>Passport Photograph (Recent, clear face, neutral background) *</span>
                </label>

                {passportPreview ? (
                  <div className="passport-preview-card">
                    <img src={passportPreview} alt="Passport preview" className="passport-img-preview" />
                    <div className="passport-preview-info">
                      <strong>{files.passport_photo?.name}</strong>
                      <span className="text-xs text-muted">
                        ({(files.passport_photo?.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPassportPreview(null)
                          setFiles(p => ({ ...p, passport_photo: null }))
                        }}
                        className="btn-replace-photo"
                      >
                        Change Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className={`upload-dropzone ${errors.passport_photo ? 'has-error' : ''}`}>
                    <UploadCloud size={32} className="dropzone-icon" />
                    <span className="dropzone-text">Click to choose or drag &amp; drop passport photo</span>
                    <span className="dropzone-hint">PNG, JPG, or WEBP up to 10MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePassportPhotoChange}
                      className="hidden-file-input"
                    />
                  </label>
                )}
                {errors.passport_photo && <span className="field-error">{errors.passport_photo}</span>}
              </div>

              {/* National ID / Passport */}
              <div className="upload-block">
                <label className="upload-label">
                  <span>National ID / Passport (Front &amp; Back)</span>
                </label>
                <label className="upload-dropzone dropzone-compact">
                  <UploadCloud size={24} className="dropzone-icon" />
                  <span className="dropzone-text">Upload National ID or Passport document(s)</span>
                  <span className="dropzone-hint">PDF or Images up to 10MB</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleMultipleFiles(e, 'national_id')}
                    className="hidden-file-input"
                  />
                </label>

                {files.national_id.length > 0 && (
                  <div className="file-chips-list">
                    {files.national_id.map((f, i) => (
                      <div key={i} className="file-chip">
                        <FileText size={14} />
                        <span className="file-chip-name">{f.name}</span>
                        <span className="file-chip-size">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                        <button type="button" onClick={() => removeFile('national_id', i)} className="btn-chip-remove">
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Academic Documents */}
              <div className="upload-block">
                <label className="upload-label">
                  <span>Academic Documents (UCE / UACE Passlips, Transcripts, Leaving Certificates) *</span>
                </label>
                <label className={`upload-dropzone dropzone-compact ${errors.academic_docs ? 'has-error' : ''}`}>
                  <UploadCloud size={24} className="dropzone-icon" />
                  <span className="dropzone-text">Upload academic certificates and transcripts</span>
                  <span className="dropzone-hint">PDF or Images up to 10MB each</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleMultipleFiles(e, 'academic_docs')}
                    className="hidden-file-input"
                  />
                </label>
                {errors.academic_docs && <span className="field-error">{errors.academic_docs}</span>}

                {files.academic_docs.length > 0 && (
                  <div className="file-chips-list">
                    {files.academic_docs.map((f, i) => (
                      <div key={i} className="file-chip">
                        <FileText size={14} />
                        <span className="file-chip-name">{f.name}</span>
                        <span className="file-chip-size">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                        <button type="button" onClick={() => removeFile('academic_docs', i)} className="btn-chip-remove">
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="step-actions">
              <button type="button" className="button button-outline" onClick={prevStep}>
                <ArrowLeft size={16} /> Back
              </button>
              <button type="button" className="button button-primary" onClick={nextStep}>
                <span>Next: Review &amp; Submit</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )

      // Step 6: Review & Submit
      case 6: {
        const selectedIntake = intakes.find(i => i.id.toString() === formData.intake_id)
        const isUgandan = formData.nationality?.toLowerCase().includes('ugand')
        const hasIntlFee = selectedIntake?.international_fee && Number(selectedIntake.international_fee) > 0
        const applicableFee = (!isUgandan && hasIntlFee)
          ? { amount: Number(selectedIntake.international_fee), currency: 'USD', label: 'International Applicant Fee' }
          : { amount: Number(selectedIntake?.application_fee || 50000), currency: 'UGX', label: 'Local Applicant Fee' }

        return (
          <div className="step-content fade-in-item">
            <div className="step-heading">
              <h2>Review Your Application</h2>
              <p className="step-desc">
                Carefully verify your details below before final submission. You can click <strong>Edit</strong> on any section to make corrections.
              </p>
            </div>

            {/* Programme Choices Summary */}
            <div className="review-card">
              <div className="review-card-header">
                <h3>Programme Preferences</h3>
                <button type="button" onClick={() => jumpToStep(0)} className="btn-review-edit">
                  <Edit3 size={14} /> Edit Choices
                </button>
              </div>
              <div className="review-body">
                <p><strong>Intake:</strong> {selectedIntake?.name || '—'}</p>
                {formData.choices.filter(c => c.programme_intake_id).map((c, i) => {
                  const prog = programmes.find(p => p.programme_intake_id.toString() === c.programme_intake_id)
                  const campus = campuses.find(cp => cp.id.toString() === c.campus_id)
                  return (
                    <div key={i} className="review-choice-item">
                      <span className="badge-choice">Choice {i + 1}</span>
                      <span><strong>{prog?.name || '—'}</strong> ({prog?.level}) @ {campus?.name || 'Main Campus'}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Personal Details Summary */}
            <div className="review-card">
              <div className="review-card-header">
                <h3>Personal &amp; Contact Details</h3>
                <button type="button" onClick={() => jumpToStep(1)} className="btn-review-edit">
                  <Edit3 size={14} /> Edit Personal Info
                </button>
              </div>
              <div className="review-grid">
                <div>
                  <span className="review-label">Full Name</span>
                  <div>{formData.first_name} {formData.middle_name} {formData.last_name}</div>
                </div>
                <div>
                  <span className="review-label">Gender &amp; Date of Birth</span>
                  <div>{formData.gender} &bull; {formData.date_of_birth}</div>
                </div>
                <div>
                  <span className="review-label">Nationality &amp; Residence</span>
                  <div>{formData.nationality} &bull; {formData.country_of_residence}</div>
                </div>
                <div>
                  <span className="review-label">National ID / Passport</span>
                  <div>{formData.id_number || 'Not provided'}</div>
                </div>
                <div>
                  <span className="review-label">Email Address</span>
                  <div>{formData.email}</div>
                </div>
                <div>
                  <span className="review-label">Phone Number</span>
                  <div>{formData.phone}</div>
                </div>
              </div>
            </div>

            {/* Next of Kin Summary */}
            <div className="review-card">
              <div className="review-card-header">
                <h3>Next of Kin / Emergency Contact</h3>
                <button type="button" onClick={() => jumpToStep(3)} className="btn-review-edit">
                  <Edit3 size={14} /> Edit Kin
                </button>
              </div>
              <div className="review-grid">
                <div>
                  <span className="review-label">Name &amp; Relationship</span>
                  <div>{formData.kin_name} ({formData.kin_relationship})</div>
                </div>
                <div>
                  <span className="review-label">Telephone</span>
                  <div>{formData.kin_phone}</div>
                </div>
              </div>
            </div>

            {/* Uploaded Documents Summary */}
            <div className="review-card">
              <div className="review-card-header">
                <h3>Attached Documents</h3>
                <button type="button" onClick={() => jumpToStep(5)} className="btn-review-edit">
                  <Edit3 size={14} /> Edit Documents
                </button>
              </div>
              <div className="review-body">
                <div className="doc-check-row">
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span><strong>Passport Photo:</strong> {files.passport_photo?.name || 'Attached'}</span>
                </div>
                <div className="doc-check-row">
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span><strong>Academic Documents:</strong> {files.academic_docs.length} file(s) attached</span>
                </div>
                {files.national_id.length > 0 && (
                  <div className="doc-check-row">
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span><strong>National ID / Passport:</strong> {files.national_id.length} file(s) attached</span>
                  </div>
                )}
              </div>
            </div>

            {/* Application Fee Notice */}
            <div className="fee-summary-box">
              <div className="fee-header">
                <CreditCard size={20} className="text-primary" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Application Fee Schedule</h4>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{applicableFee.label}</span>
                </div>
              </div>
              <div className="fee-amount">
                {applicableFee.currency === 'USD' ? '$' : 'UGX '}
                {applicableFee.amount.toLocaleString()}
                <span className="fee-currency">{applicableFee.currency}</span>
              </div>
              <p className="fee-note">
                Your application fee payment can be completed via Mobile Money or Bank deposit immediately after submission. Official instructions will appear on your success screen and be sent to your email.
              </p>
            </div>

            {submitError && (
              <div className="submit-error-box fade-in-item">
                <AlertCircle size={18} />
                <span>{submitError}</span>
              </div>
            )}

            <div className="step-actions">
              <button type="button" className="button button-outline" onClick={prevStep} disabled={submitting}>
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                className="button button-accent button-lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting Application...' : 'Submit Application Now'}
              </button>
            </div>
          </div>
        )
      }

      default:
        return null
    }
  }

  // -------------------------------------------------------------
  // MAIN WRAPPER
  // -------------------------------------------------------------
  const progressPercent = Math.round(((currentStep + 1) / STEPS.length) * 100)

  return (
    <div className="apply-page">
      {/* Draft Restored Banner */}
      {draftRestored && (
        <div className="draft-banner">
          <div className="container draft-banner-inner">
            <div className="draft-banner-text">
              <Sparkles size={16} />
              <span>We restored your saved application draft so you can continue where you left off.</span>
            </div>
            <button type="button" onClick={handleClearDraft} className="btn-clear-draft">
              Clear &amp; Start Fresh
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="apply-header">
        <div className="container">
          <span className="apply-pill">Admissions Portal</span>
          <h1>Online Student Application</h1>
          <p>
            Apply for undergraduate, diploma, or certificate programmes at Multitech Business School. Your progress is auto-saved as you type.
          </p>
        </div>
      </header>

      {/* Main Container */}
      <div className="container apply-container">
        {/* Interactive Stepper */}
        <div className="wizard-progress-card">
          <div className="wizard-progress">
            {STEPS.map((step, idx) => {
              const Icon = step.icon
              const isPassed = idx < currentStep
              const isActive = idx === currentStep
              const isClickable = idx <= maxStepReached

              return (
                <div
                  key={idx}
                  onClick={() => isClickable && jumpToStep(idx)}
                  className={`progress-step ${isActive ? 'active' : ''} ${isPassed ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
                  title={`Go to ${step.title}`}
                >
                  <div className="step-number">
                    {isPassed ? <Check size={16} strokeWidth={3} /> : idx + 1}
                  </div>
                  <div className="step-label">{step.title}</div>
                </div>
              )
            })}
          </div>

          {/* Glowing Slim Progress Bar */}
          <div className="progress-bar-container">
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="progress-bar-meta">
              <span>Step {currentStep + 1} of {STEPS.length}: <strong>{STEPS[currentStep].title}</strong></span>
              <span>{progressPercent}% Complete</span>
            </div>
          </div>
        </div>

        {/* Wizard Form Content */}
        <div className="wizard-body">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}
