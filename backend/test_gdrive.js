import { uploadToDrive } from './src/utils/googleDriveService.js'

async function test() {
  const dummyFile = {
    buffer: Buffer.from('Hello World'),
    originalname: 'test.txt',
    mimetype: 'text/plain'
  }
  
  try {
    console.log('Testing GDrive Upload...')
    const result = await uploadToDrive(dummyFile)
    console.log('Success:', result)
  } catch (err) {
    console.error('Test Failed!')
  }
}

test()
