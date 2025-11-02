import { sql } from '@vercel/postgres';
import { dequeueJob } from '../lib/queue';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { type VercelRequest, type VercelResponse } from '@vercel/node';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Optional: Secure the cron job (e.g., check req.headers['x-vercel-cron-authorization'])

  let jobId: string | null = null;

  try {
    // 1. Pull one job from the queue (non-blocking)
    jobId = await dequeueJob();

    if (!jobId) {
      return res.status(200).json({ message: 'No jobs in queue.' });
    }

    // 2. Update job status to 'running'
    await sql`UPDATE jobs SET status = 'running' WHERE id = ${jobId}`;

    // Fetch the HTML content
    const { rows } = await sql`SELECT html_content FROM jobs WHERE id = ${jobId}`;
    if (rows.length === 0) {
      throw new Error(`Job ${jobId} not found in DB.`);
    }
    const html = rows[0].html_content;

    // 3. CRUCIAL: The minimal AI call
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Here is HTML. How many <a> tags are in it? Respond ONLY with valid JSON in the format: {"count": N}. HTML: ${html}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Clean and parse the JSON response from the AI
    const aiResult = JSON.parse(responseText.replace(/```json|```/g, '').trim());

    // 4. Update job to 'succeeded' with the AI's result
    await sql`
      UPDATE jobs
      SET status = 'succeeded', meta = ${JSON.stringify(aiResult)}
      WHERE id = ${jobId}
    `;

    return res.status(200).json({ success: true, jobId, result: aiResult });

  } catch (error) {
    console.error('Worker error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    // 5. Handle errors: Mark the job as 'failed'
    if (jobId) {
      await sql`
        UPDATE jobs
        SET status = 'failed', meta = ${JSON.stringify({ error: message })}
        WHERE id = ${jobId}
      `;
    }
    return res.status(500).json({ success: false, error: message });
  }
}
