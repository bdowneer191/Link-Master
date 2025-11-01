import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createJob } from '../../services/dbService';
import { kv } from '@vercel/kv';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const { htmlContent } = req.body as { htmlContent: string };

        if (!htmlContent) {
            return res.status(400).json({ error: 'Missing htmlContent in request body' });
        }

        const jobId = await createJob(htmlContent);
        await kv.lpush('job_queue', jobId);

        res.status(202).json({ jobId });

    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: errorMessage });
    }
}
