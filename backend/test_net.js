import net from 'net'

const host = 'ep-dark-tree-aianlnh0-pooler.c-4.us-east-1.aws.neon.tech'
const port = 5432

console.log(`Connecting to ${host}:${port} via IPv4...`)

const client = net.createConnection({
  host,
  port,
  family: 4
}, () => {
  console.log('Connected successfully via TCP!')
  client.end()
})

client.on('error', (err) => {
  console.error('Connection error:', err)
})
