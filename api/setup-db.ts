import { createJobTable } from '../lib/db';
import { type Request, type Response } from '@vercel/node';

export default async function handler(req: Request, res: Response) {
try {
await createJobTable();
res.status(200).send('
Database table "jobs" created successfully!
');

} catch (error) {
const message = error instanceof Error ? error.message : 'Unknown error';
res.status(500).send(`
Error:
${message}
`);

}
}
