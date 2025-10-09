import { Pool } from 'pg'

const pool = new Pool({
  user: process.env.NEON_POSTGRES_USER!,
  password: process.env.NEON_POSTGRES_PASSWORD!,
  host: process.env.NEON_POSTGRES_HOST!,
  port: parseInt(process.env.NEON_POSTGRES_PORT || '5432'),
  database: process.env.NEON_POSTGRES_DATABASE!,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err)
})

export { pool as db }
