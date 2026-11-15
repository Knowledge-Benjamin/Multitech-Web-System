import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyNtag424SunTap } from '../src/services/ntag424Sdm.js'

const validTap = {
  issuerKey: '00000000000000000000000000000001',
  piccData: 'e61cb056f52d34f9368f079d1814d2cf',
  mac: 'fcc9a22201ea2298'
}

test('verifies an NTAG 424 SUN tap and returns its UID and monotonic counter', () => {
  assert.deepEqual(verifyNtag424SunTap(validTap), {
    uid: '0425607a8f6980',
    counter: 0
  })
})

test('rejects a tap when its SUN MAC has been changed', () => {
  assert.throws(
    () => verifyNtag424SunTap({ ...validTap, mac: '0000000000000000' }),
    /Invalid NFC tap/
  )
})

test('rejects malformed or incomplete tag data', () => {
  assert.throws(
    () => verifyNtag424SunTap({ ...validTap, piccData: 'not-hex' }),
    /Invalid PICC data/
  )
  assert.throws(
    () => verifyNtag424SunTap({ ...validTap, issuerKey: '' }),
    /Invalid NFC issuer key/
  )
})
