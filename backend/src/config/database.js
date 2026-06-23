import 'dotenv/config'
import ws from 'ws'
import https from 'https'
import dns from 'dns'
import { neonConfig, Pool } from '@neondatabase/serverless'

// Force IPv4-only DNS to avoid ENETUNREACH on IPv6 addresses
dns.setDefaultResultOrder('ipv4first')

// Custom WebSocket class that forces IPv4 DNS resolution
class IPv4WebSocket extends ws {
  constructor(address, protocols, options) {
    super(address, protocols, {
      ...options,
      lookup: (hostname, opts, cb) => {
        dns.lookup(hostname, { ...opts, family: 4 }, cb)
      },
      agent: new https.Agent({ family: 4 })
    })
  }
}

neonConfig.webSocketConstructor = IPv4WebSocket

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err.message)
})

export default pool