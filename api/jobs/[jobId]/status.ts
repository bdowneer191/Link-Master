import { sql } from '@vercel/postgres';
import { type VercelRequest, type VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { jobId } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { rows } = await sql`
      SELECT id, status, meta, created_at FROM jobs WHERE id = ${jobId as string}
    `;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Return the raw job row JSON
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return res.status(500).json({ error: message });
  }
}
