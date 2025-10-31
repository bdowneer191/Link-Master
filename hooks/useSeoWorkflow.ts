import { useState, useCallback } from 'react';
import type { Credentials, ProcessingLog } from '../types';

export const useSeoWorkflow = (credentials: Credentials) => {
  const [isLoading, setIsLoading] = useState(false);
  const [log, setLog] = useState<ProcessingLog | null>(null);

  const addLog = useCallback((postUrl: string, message: string, type: 'info' | 'success' | 'error') => {
    setLog({ postUrl, message, type });
  }, []);

  const processUrl = useCallback(async (postUrl: string) => {
    setIsLoading(true);
    addLog(postUrl, 'Workflow started.', 'info');

    try {
      const response = await fetch('/api/process-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postUrl, credentials }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      addLog(postUrl, result.message, 'success');
      setIsLoading(false);
      return result.message;
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(postUrl, `Error: ${errorMessage}`, 'error');
      setIsLoading(false);
      throw error;
    }
  }, [credentials, addLog]);

  return { processUrl, isLoading, log };
};
