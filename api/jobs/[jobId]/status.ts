import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getJob } from '../../../services/dbService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const { jobId } = req.query;

        if (!jobId || typeof jobId !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid jobId in request query' });
        }

        const job = await getJob(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.status(200).json({ status: job.status, result: job.result });

    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: errorMessage });
    }
}
