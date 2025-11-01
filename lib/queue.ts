// lib/queue.ts
import { kv } from '@vercel/kv';

const JOB_QUEUE_KEY = 'link_master_queue';

// Enqueues a job ID [cite: 195]
export async function enqueueJob(jobId: string) {
  return await kv.lpush(JOB_QUEUE_KEY, jobId);
}

// Dequeues a job ID (blocking pop from the right)
export async function dequeueJob() {
  // Use brpop for a blocking pop, 0 timeout means wait forever
  // This is how a worker "pulls" a job [cite: 200]
  // Vercel KV supports this Redis command
  return await kv.brpop(JOB_QUEUE_KEY, 0);
}
