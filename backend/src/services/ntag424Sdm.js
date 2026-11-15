import { createCipheriv, createDecipheriv, timingSafeEqual } from 'crypto'

const BLOCK_SIZE = 16
const PICC_DATA_TAG = 0xc7

const asHexBytes = (value, length, fieldName) => {
  if (typeof value !== 'string' || !new RegExp(`^(?:[0-9a-fA-F]{2}){${length}}$`).test(value)) {
    throw new Error(`Invalid ${fieldName}`)
  }
  return Buffer.from(value, 'hex')
}

const encryptBlock = (key, block) => {
  const cipher = createCipheriv('aes-128-ecb', key, null)
  cipher.setAutoPadding(false)
  return Buffer.concat([cipher.update(block), cipher.final()])
}

const xor = (left, right) => Buffer.from(left.map((value, index) => value ^ right[index]))

const doubleBlock = (block) => {
  const result = Buffer.alloc(BLOCK_SIZE)
  let carry = 0
  for (let i = BLOCK_SIZE - 1; i >= 0; i--) {
    const value = block[i]
    result[i] = ((value << 1) & 0xff) | carry
    carry = value >> 7
  }
  if (carry) result[BLOCK_SIZE - 1] ^= 0x87
  return result
}

const aesCmac = (key, message) => {
  if (!Buffer.isBuffer(key) || key.length !== BLOCK_SIZE) {
    throw new Error('AES-CMAC key must be 16 bytes')
  }

  const subkey1 = doubleBlock(encryptBlock(key, Buffer.alloc(BLOCK_SIZE)))
  const subkey2 = doubleBlock(subkey1)
  const blockCount = Math.max(1, Math.ceil(message.length / BLOCK_SIZE))
  const complete = message.length > 0 && message.length % BLOCK_SIZE === 0
  const lastOffset = (blockCount - 1) * BLOCK_SIZE
  let lastBlock

  if (complete) {
    lastBlock = xor(message.subarray(lastOffset), subkey1)
  } else {
    const padded = Buffer.alloc(BLOCK_SIZE)
    const remaining = message.subarray(lastOffset)
    remaining.copy(padded)
    padded[remaining.length] = 0x80
    lastBlock = xor(padded, subkey2)
  }

  let state = Buffer.alloc(BLOCK_SIZE)
  for (let offset = 0; offset < lastOffset; offset += BLOCK_SIZE) {
    state = encryptBlock(key, xor(state, message.subarray(offset, offset + BLOCK_SIZE)))
  }

  return encryptBlock(key, xor(state, lastBlock))
}

const deriveMetaReadKey = (issuerKey) => aesCmac(issuerKey, Buffer.from('2d003f77', 'hex'))

const deriveFileReadMacKey = (uid, issuerKey, version) => {
  if (!Number.isInteger(version) || version < 0 || version > 0xffffffff) {
    throw new Error('Invalid NFC key version')
  }
  const versionBytes = Buffer.alloc(4)
  versionBytes.writeUInt32LE(version)
  const cardKey = aesCmac(issuerKey, Buffer.concat([
    Buffer.from('2d003f75', 'hex'),
    uid,
    versionBytes
  ]))

  return aesCmac(cardKey, Buffer.from('2d003f78', 'hex'))
}

const decryptPiccData = (encryptedPiccData, metaReadKey) => {
  const decipher = createDecipheriv('aes-128-cbc', metaReadKey, Buffer.alloc(BLOCK_SIZE))
  decipher.setAutoPadding(false)
  const piccData = Buffer.concat([decipher.update(encryptedPiccData), decipher.final()])

  if (piccData[0] !== PICC_DATA_TAG) throw new Error('Invalid NFC tap')
  const uid = piccData.subarray(1, 8)
  const counterBytes = piccData.subarray(8, 11)
  if (uid.every((byte) => byte === 0)) throw new Error('Invalid NFC tap')

  return { uid, counterBytes }
}

const buildSunMac = (uid, counterBytes, fileReadMacKey) => {
  const sv2 = Buffer.concat([
    Buffer.from('3cc300010080', 'hex'),
    uid,
    counterBytes
  ])
  const sessionMacKey = aesCmac(fileReadMacKey, sv2)
  const fullMac = aesCmac(sessionMacKey, Buffer.alloc(0))
  return Buffer.from([1, 3, 5, 7, 9, 11, 13, 15].map((index) => fullMac[index]))
}

export const decodeNtag424SdmPiccData = ({ piccData, issuerKey }) => {
  const encryptedPiccData = asHexBytes(piccData, 16, 'PICC data')
  const masterKey = asHexBytes(issuerKey, 16, 'NFC issuer key')
  const initialData = decryptPiccData(encryptedPiccData, deriveMetaReadKey(masterKey))

  return {
    uid: initialData.uid.toString('hex'),
    counter: initialData.counterBytes[0] | (initialData.counterBytes[1] << 8) | (initialData.counterBytes[2] << 16),
    uidBytes: initialData.uid,
    counterBytes: initialData.counterBytes
  }
}

export const verifyNtag424SunTap = ({ piccData, mac, issuerKey, keyVersion = 1 }) => {
  const providedMac = asHexBytes(mac, 8, 'SUN MAC')
  const masterKey = asHexBytes(issuerKey, 16, 'NFC issuer key')
  const tap = decodeNtag424SdmPiccData({ piccData, issuerKey })
  const fileReadMacKey = deriveFileReadMacKey(tap.uidBytes, masterKey, keyVersion)
  const expectedMac = buildSunMac(tap.uidBytes, tap.counterBytes, fileReadMacKey)

  if (!timingSafeEqual(providedMac, expectedMac)) throw new Error('Invalid NFC tap')

  return { uid: tap.uid, counter: tap.counter }
}
