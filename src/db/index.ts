import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { mindmaps, mindmapNodes } from './schema';

// Replace with your actual database connection string environment variable
const databaseUrl = process.env.DATABASE_URL ||
  `postgresql://postgres.${process.env.SUPABASE_PROJECT_REF}:${process.env.DB_PASSWORD}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(databaseUrl);

export const db = drizzle(client, { schema: { mindmaps, mindmapNodes } });

// You can add more specific types if needed later
// export type Db = typeof db;
