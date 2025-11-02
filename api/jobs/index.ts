import { sql } from '@vercel/postgres';
import { enqueueJob } from '../../lib/queue';
import { type VercelRequest, type VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { html_content } = req.body;
    if (!html_content) {
      return res.status(400).json({ error: 'html_content is required' });
    }

    // 1. Create Job in DB with 'queued' status
    const result = await sql`
      INSERT INTO jobs (source_type, status, html_content)
      VALUES ('paste', 'queued', ${html_content})
      RETURNING id;
    `;
    const jobId = result.rows[0].id;

    // 2. Enqueue the new jobId
    await enqueueJob(jobId);

    // 3. Return the jobId to the frontend
    return res.status(202).json({ jobId });
  } catch (error) {
    console.error(error);
    // Ensure error is a recognizable type
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return res.status(500).json({ error: message });
  }
}
