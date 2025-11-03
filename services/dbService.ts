// Overwrite services/dbService.ts with this:

import { db, Job, JobStatus } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dbService = {
/**
* Creates a new job in the database.
*/
createJob: async (data: {
sourceType: Job['source_type'];
meta?: Job['meta'];
}): Promise<Job> => {
const jobId = uuidv4();
const query = `
INSERT INTO jobs (id, status, source_type, meta, created_at)
VALUES ($1, $2, $3, $4, NOW())
RETURNING *;
`;
const params = [jobId, 'queued', data.sourceType, data.meta || null];
const { rows } = await db.query(query, params);
return rows[0] as Job;
},

/**
* Fetches a job by its ID.
*/
getJob: async (jobId: string): Promise<Job | null> => {
const query = `SELECT * FROM jobs WHERE id = $1;`;
const { rows } = await db.query(query, [jobId]);
return rows[0] ? (rows[0] as Job) : null;
},

/**
* Updates a job's status.
*/
updateJobStatus: async (
jobId: string,
status: JobStatus
): Promise<Job | null> => {
const query = `
UPDATE jobs SET status = $1 WHERE id = $2 RETURNING *;
`;
const { rows } = await db.query(query, [status, jobId]);
return rows[0] ? (rows[0] as Job) : null;
},

/**
* Updates a job with a final result or error.
*/
updateJobResult: async (
jobId: string,
update: { status: 'succeeded' | 'failed'; result?: Job['result']; error?: string }
): Promise<Job | null> => {
const { status, result, error } = update;
const query = `
UPDATE jobs
SET status = $1, result = $2, error = $3
WHERE id = $4
RETURNING *;
`;
const params = [status, result || null, error || null, jobId];
const { rows } = await db.query(query, params);
return rows[0] ? (rows[0] as Job) : null;
},
};
