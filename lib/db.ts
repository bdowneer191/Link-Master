// lib/db.ts
import { sql } from '@vercel/postgres';

// Simplified Job model for our first slice
export interface Job {
  id: string;
  created_at: string;
  source_type: 'paste'; // Only 'paste' for this slice [cite: 184]
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  html_content: string; // The raw HTML pasted by the user [cite: 195]
  meta: Record<string, any> | null; // To store AI results
}

// Function to create the table if it doesn't exist.
// We can run this once from a setup script or an admin endpoint.
export async function createJobTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      source_type VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'queued',
      html_content TEXT,
      meta JSONB
    );
  `;
}
