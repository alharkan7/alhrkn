import { Pool } from 'pg'

// Use Supabase connection (same as Papermap app)
const databaseUrl = process.env.DATABASE_URL ||
  `postgresql://postgres.${process.env.SUPABASE_PROJECT_REF}:${process.env.DB_PASSWORD}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or Supabase credentials are not set');
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test the connection
pool.on('connect', () => {
  console.log('Connected to Supabase PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err)
})

export { pool as db }
