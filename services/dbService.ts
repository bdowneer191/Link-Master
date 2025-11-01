import { sql } from '@vercel/postgres';
import { randomUUID } from 'crypto';

export interface Job {
    id: string;
    html_content: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: string;
    created_at: Date;
    updated_at: Date;
}

export async function createJobsTable() {
    await sql`
        CREATE TABLE IF NOT EXISTS jobs (
            id UUID PRIMARY KEY,
            html_content TEXT NOT NULL,
            status VARCHAR(255) NOT NULL,
            result TEXT,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        );
    `;
}

export async function createJob(htmlContent: string): Promise<string> {
    const jobId = randomUUID();
    const now = new Date();
    await createJobsTable(); // Ensure table exists
    await sql`
        INSERT INTO jobs (id, html_content, status, created_at, updated_at)
        VALUES (${jobId}, ${htmlContent}, 'pending', ${now.toISOString()}, ${now.toISOString()});
    `;
    return jobId;
}

export async function getJob(jobId: string): Promise<Job | null> {
    const { rows } = await sql<Job>`
        SELECT * FROM jobs WHERE id = ${jobId};
    `;
    if (rows.length === 0) {
        return null;
    }
    return rows[0];
}

export async function updateJobStatus(jobId: string, status: Job['status'], result?: string) {
    const now = new Date();
    const { rowCount } = await sql`
        UPDATE jobs
        SET status = ${status}, result = ${result}, updated_at = ${now.toISOString()}
        WHERE id = ${jobId};
    `;
    return rowCount > 0;
}
