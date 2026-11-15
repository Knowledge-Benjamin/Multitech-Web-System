import assert from 'node:assert/strict'
import test from 'node:test'
import pool from '../src/config/database.js'
import { getMyCard } from '../src/controllers/idCardController.js'

test('uses the authenticated student record ID instead of the student account ID', async (t) => {
  const studentId = 17
  const card = {
    id: 6,
    student_id: studentId,
    cardholder_name: 'Student Seventeen',
    photo_url: '/student-17.jpg'
  }
  const queries = []

  t.mock.method(pool, 'query', async (sql, values) => {
    queries.push({ sql, values })
    if (sql.includes('FROM institutional_id_cards WHERE student_id = $1')) {
      return { rows: [card] }
    }
    throw new Error(`Unexpected query: ${sql}`)
  })

  const response = {
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    }
  }

  await getMyCard({ student: { id: 91, studentId } }, response)

  assert.equal(queries.length, 1)
  assert.equal(queries[0].values[0], studentId)
  assert.deepEqual(response.body, { success: true, data: card })
})
