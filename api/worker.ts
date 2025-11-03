// Overwrite api/worker.ts with this:

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Receiver } from '@upstash/qstash';
import { dbService } from '../services/dbService';
import { aiService } from '../services/aiService'; // <-- IMPORT NEW SERVICE
import * as cheerio from 'cheerio'; // <-- IMPORT CHEERIO

if (
  !process.env.QSTASH_CURRENT_SIGNING_KEY ||
  !process.env.QSTASH_NEXT_SIGNING_KEY
) {
  throw new Error('Missing QStash signing key environment variables');
}

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

/**
 * Extracts the main text content from HTML.
 * This is a simple heuristic from your plan (Step E: Preprocess / normalize).
 */
function extractMainContent(html: string): string {
  try {
    const $ = cheerio.load(html);

    // Remove common clutter
    $('script, style, nav, footer, header, aside, .sidebar').remove();

    // Try to find the main content, fall back to body
    let mainText =
      $('main').text() ||
      $('article').text() ||
      $('.post-content').text() ||
      $('body').text();

    // Simple text normalization
    return mainText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 20) // Keep only paragraph-like lines
      .join('\n');
  } catch (error) {
    console.error('Cheerio parsing error:', error);
    // Fallback: return a basic text version
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

const handler = async (req: VercelRequest, res: VercelResponse) => {
  // 1. Verify QStash signature
  const isValid = await receiver
    .verify({
      signature: req.headers['upstash-signature'] as string,
      body: (req as any).body,
    })
    .catch((err) => {
      console.error('QStash verification raw error:', err);
      return false;
    });

  if (!isValid) {
    console.warn('Failed to verify QStash signature.');
    return res.status(401).send('Unauthorized');
  }

  // 2. Parse body
  let body: any;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { jobId } = body as { jobId: string };
  if (!jobId) {
    return res.status(400).json({ error: 'Missing jobId in body' });
  }

  console.log(`Worker processing job: ${jobId}`);

  try {
    // 3. Update job status to 'running'
    await dbService.updateJobStatus(jobId, 'running');

    // 4. Fetch job details
    const job = await dbService.getJob(jobId);
    if (!job || !job.meta || !job.meta.htmlContent || !job.meta.urls) {
      throw new Error(`Job ${jobId} not found or missing meta data`);
    }

    const { htmlContent, urls } = job.meta as {
      htmlContent: string;
      urls: string[];
    };

    // 5. ---- NEW AI PIPELINE (SLICE 1) ----

    // Step E: Preprocess / normalize
    console.log(`Extracting content for job ${jobId}...`);
    const mainContent = extractMainContent(htmlContent);

    // Step F: AI Usage - analyze_and_plan
    console.log(`Generating link plan for job ${jobId}...`);
    const linkPlan = await aiService.generateLinkPlan(mainContent, urls);
    // ------------------------------------

    // 6. Save the successful result (the plan) to the DB
    await dbService.updateJobResult(jobId, {
      status: 'succeeded',
      result: {
        plan: linkPlan.plan,
        originalHtml: htmlContent, // Save original HTML for the next step (diff viewer)
      },
    });

    console.log(`Worker completed job: ${jobId}`);
    return res.status(200).json({ success: true, jobId });

  } catch (error: any) {
    console.error(`Worker failed on job ${jobId}:`, error);
    await dbService.updateJobResult(jobId, {
      status: 'failed',
      error: error.message || 'An unknown error occurred',
    });
    return res.status(200).json({ success: false, error: error.message });
  }
};

export default handler;
