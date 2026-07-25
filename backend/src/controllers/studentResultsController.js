import pool from '../config/database.js'
import { asyncHandler } from '../utils/helpers.js'

/**
 * GET /api/student-profile/results
 * Fetches all grades for the logged-in student, computes CGPA and credits.
 */
export const getMyResults = asyncHandler(async (req, res) => {
  const { studentId } = req.student
  if (!studentId) {
    return res.status(404).json({ success: false, message: 'Student record not found.' })
  }

  // Fetch all grades for the student, joined with course info for credits
  // We join through course_registrations to courses
  const query = `
    SELECT 
      g.id as grade_id,
      g.coursework_mark,
      g.exam_mark,
      g.final_score,
      c.course_code,
      c.name as course_name,
      c.credits,
      t.name as term_name,
      t.start_date as term_start,
      ste.study_year,
      ste.study_semester
    FROM grades g
    JOIN course_registrations cr ON g.course_registration_id = cr.id
    JOIN courses c ON cr.course_id = c.id
    JOIN student_term_enrollments ste ON cr.student_term_enrollment_id = ste.id
    JOIN academic_terms t ON ste.academic_term_id = t.id
    WHERE ste.student_id = $1
    ORDER BY t.start_date DESC, c.course_code ASC
  `

  const result = await pool.query(query, [studentId])
  const rawGrades = result.rows

  // Process grades and compute CGPA
  let totalPoints = 0
  let totalCreditsAttempted = 0
  let totalCreditsEarned = 0

  const processedGrades = rawGrades.map(grade => {
    let score = Number(grade.final_score) || 0
    let gradeLetter = 'F'
    let gradePoint = 0.0

    // Standard 5.0 Scale: A(80-100)=5, B(70-79)=4, C(60-69)=3, D(50-59)=2, F(<50)=0
    if (score >= 80) { gradeLetter = 'A'; gradePoint = 5.0 }
    else if (score >= 70) { gradeLetter = 'B'; gradePoint = 4.0 }
    else if (score >= 60) { gradeLetter = 'C'; gradePoint = 3.0 }
    else if (score >= 50) { gradeLetter = 'D'; gradePoint = 2.0 }
    else { gradeLetter = 'F'; gradePoint = 0.0 }

    const credits = Number(grade.credits) || 3

    totalCreditsAttempted += credits
    if (gradePoint > 0) {
      totalCreditsEarned += credits
    }
    totalPoints += (gradePoint * credits)

    return {
      ...grade,
      grade_letter: gradeLetter,
      grade_point: gradePoint
    }
  })

  const cgpa = totalCreditsAttempted > 0 ? (totalPoints / totalCreditsAttempted).toFixed(2) : '0.00'

  // Group by academic term for the UI
  const groupedByTerm = processedGrades.reduce((acc, curr) => {
    const termKey = `Year ${curr.study_year} - ${curr.term_name}`
    if (!acc[termKey]) {
      acc[termKey] = {
        term_name: curr.term_name,
        study_year: curr.study_year,
        grades: []
      }
    }
    acc[termKey].grades.push(curr)
    return acc
  }, {})

  res.json({
    success: true,
    data: {
      cgpa,
      totalCreditsAttempted,
      totalCreditsEarned,
      terms: Object.values(groupedByTerm)
    }
  })
})
