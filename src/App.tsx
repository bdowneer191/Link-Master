// src/App.tsx
import { useState, type FormEvent } from 'react';

// This matches the DB row from /api/jobs/[jobId]/status
interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result: any;
  created_at: string;
}

function App() {
  const [html, setHtml] = useState('<p>This is a test.</p><a href="#">Link 1</a><a href="#">Link 2</a>');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Polling interval timer
  let intervalId: NodeJS.Timeout | null = null;

  const pollJobStatus = (id: string) => {
    intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${id}/status`);
        if (!res.ok) throw new Error('Failed to fetch status');

        const data: JobStatus = await res.json();
        setJobStatus(data);

        // Stop polling if job is done
        if (data.status === 'completed' || data.status === 'failed') {
          if (intervalId) clearInterval(intervalId);
          setJobId(null); // Reset for new job
        }
      } catch (err) {
        setError(err.message);
        if (intervalId) clearInterval(intervalId);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (jobId) return; // Prevent multiple submissions

    setJobStatus(null);
    setError(null);

    try {
      // 1. POST HTML to create job [cite: 189]
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: html }),
      });

      if (!res.ok) throw new Error('Failed to create job');

      const { jobId: newJobId } = await res.json();
      setJobId(newJobId);

      // 2. Start polling for status
      pollJobStatus(newJobId);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', margin: '2rem' }}>
      <h1>Link Master - First Slice</h1>
      <form onSubmit={handleSubmit}>
        <h3>Paste HTML to Process:</h3>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={10}
          cols={80}
          style={{ display: 'block' }}
        />
        <button type="submit" disabled={!!jobId} style={{ marginTop: '1rem' }}>
          {jobId ? 'Processing...' : 'Submit Job'}
        </button>
      </form>

      {/* Realtime Status Display */}
      {jobId && !jobStatus && <p>Job submitted! Waiting for worker...</p>}

      {jobStatus && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Job Status</h3>
          <p>Job ID: {jobStatus.id}</p>
          <p>Status: <strong>{jobStatus.status}</strong></p>

          {/* Display raw JSON result  */}
          {jobStatus.result && (
            <pre style={{ background: '#f4f4f4', padding: '1rem' }}>
              {JSON.stringify(jobStatus.result, null, 2)}
            </pre>
          )}
        </div>
      )}

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}

export default App;