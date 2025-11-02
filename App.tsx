import { useState, type FormEvent, useRef } from 'react';

// This matches the DB row from /api/jobs/[jobId]/status
interface JobStatus {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  meta: any;
  created_at: string;
}

function App() {
  const [html, setHtml] = useState('<p>This is a test.</p><a href="#">Link 1</a><a href="#">Link 2</a>');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to store the interval ID
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  const pollJobStatus = (id: string) => {
    // Clear any existing pollers
    if (intervalId.current) {
      clearInterval(intervalId.current);
    }

    intervalId.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${id}/status`);
        if (!res.ok) throw new Error('Failed to fetch status');
        
        const data: JobStatus = await res.json();
        setJobStatus(data);

        // Stop polling if job is done
        if (data.status === 'succeeded' || data.status === 'failed') {
          if (intervalId.current) clearInterval(intervalId.current);
          setJobId(null); // Reset for new job
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        if (intervalId.current) clearInterval(intervalId.current);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (jobId) return; // Prevent multiple submissions

    setJobStatus(null);
    setError(null);

    try {
      // 1. POST HTML to create job
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html_content: html }),
      });

      if (!res.ok) throw new Error('Failed to create job');
      
      const { jobId: newJobId } = await res.json();
      setJobId(newJobId);
      setJobStatus({ // Set an initial "queued" state immediately
        id: newJobId,
        status: 'queued',
        meta: null,
        created_at: new Date().toISOString()
      });
      
      // 2. Start polling for status
      pollJobStatus(newJobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', margin: '2rem', maxWidth: '800px' }}>
      <h1>Link Master - Vertical Slice Test</h1>
      <form onSubmit={handleSubmit}>
        <h3>Paste HTML to Process:</h3>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={10}
          cols={80}
          style={{ display: 'block', width: '100%', padding: '8px' }}
        />
        <button type="submit" disabled={!!jobId} style={{ marginTop: '1rem', padding: '10px 15px' }}>
          {jobId ? 'Processing...' : 'Submit Job'}
        </button>
      </form>

      {/* Realtime Status Display */}
      {jobStatus && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Job Status</h3>
          <p>Job ID: {jobStatus.id}</p>
          <p>Status: <strong style={{ textTransform: 'uppercase' }}>{jobStatus.status}</strong></p>
          
          {/* Display raw JSON result */}
          {jobStatus.meta && (
            <>
              <h4>Result:</h4>
              <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px', overflowX: 'auto' }}>
                {JSON.stringify(jobStatus.meta, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}

      {error && <p style={{ color: 'red', marginTop: '1rem' }}>Error: {error}</p>}
    </div>
  );
}

export default App;
