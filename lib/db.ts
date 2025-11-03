// Overwrite lib/db.ts with this:

import { Pool } from 'pg';

if (!process.env.POSTGRES_URL) {
throw new Error('Missing POSTGRES_URL environment variable');
}

// Vercel automatically provides the correct config from the POSTGRES_URL env var
// when using 'pg'.
const pool = new Pool({
connectionString: process.env.POSTGRES_URL,
ssl: {
rejectUnauthorized: false, // Required for Vercel Postgres
},
});

export const db = {
query: (text: string, params: any[]) => pool.query(text, params),
};

// We will also need to define our Job types
// You can move this to types.ts later
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface Job {
id: string;
created_at: string;
status: JobStatus;
source_type: 'paste' | 'sheet' | 'url';
meta?: Record<string, any>;
result?: Record<string, any>;
error?: string;
}
