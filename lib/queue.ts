
import { kv } from '@vercel/kv';

const JOB_QUEUE_KEY = 'link_master_queue';

/**
 * Enqueues a job ID by pushing it to the left of the list.
 */
export async function enqueueJob(jobId: string) {
  return await kv.lpush(JOB_QUEUE_KEY, jobId);
}

/**
 * Dequeues a job ID by popping from the right of the list.
 * We use a simple non-blocking pop (rpop) for our cron-based worker.
 * A blocking pop (brpop) would be used for a long-running worker.
 */
export async function dequeueJob(): Promise<string | null> {
  return await kv.rpop(JOB_QUEUE_KEY);
}
