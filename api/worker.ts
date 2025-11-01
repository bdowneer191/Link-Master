import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { getJob, updateJobStatus } from '../services/dbService';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google AI client
if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Secure the cron job with a secret
    if (process.env.CRON_SECRET && req.headers['x-vercel-cron-secret'] !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    let jobId: string | null = null;

    try {
        // 1. Dequeue a job
        jobId = await kv.rpop('job_queue');

        if (!jobId) {
            return res.status(200).json({ message: 'No jobs in queue.' });
        }

        // 2. Update status to 'processing'
        await updateJobStatus(jobId, 'processing');

        // 3. Get the job details
        const job = await getJob(jobId);
        if (!job) {
            // In theory, this should not happen if the job was just dequeued
            throw new Error(`Job with ID ${jobId} not found.`);
        }
        const html = job.html_content;

        // 4. The minimal AI call to count <a> tags
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `Here is HTML. How many <a> tags are in it? Respond ONLY with valid JSON in the format: {"count": N}. HTML: ${html}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const aiResult = JSON.parse(responseText.replace(/```json|```/g, '').trim());

        // 5. Update job to 'completed' with the result
        await updateJobStatus(jobId, 'completed', JSON.stringify(aiResult));

        return res.status(200).json({ success: true, jobId, result: aiResult });

    } catch (error: any) {
        console.error('Worker error:', error);

        // 6. Handle errors by updating the job status
        if (jobId) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await updateJobStatus(jobId, 'failed', JSON.stringify({ error: errorMessage }));
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        return res.status(500).json({ success: false, error: errorMessage });
    }
}
