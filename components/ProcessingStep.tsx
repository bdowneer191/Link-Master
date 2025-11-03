// Overwrite components/ProcessingStep.tsx with this:

import React from 'react';
import { JobStatusResponse } from '../hooks/useSeoWorkflow';
import { CheckCircleIcon, XCircleIcon } from './icons';

interface ProcessingStepProps {
  onProcess: () => void;
  jobStatus: JobStatusResponse | null;
  isProcessing: boolean;
  error: string | null;
}

export const ProcessingStep: React.FC<ProcessingStepProps> = ({
  onProcess,
  jobStatus,
  isProcessing,
  error,
}) => {
  const getStatusMessage = () => {
    // ... (This function remains unchanged, no need to copy it)
    if (error && !isProcessing) {
      return `Error: ${error}`;
    }
    if (!isProcessing && !jobStatus) {
      return 'Ready to process.';
    }
    if (jobStatus?.status === 'queued') {
      return 'Job is queued...';
    }
    if (jobStatus?.status === 'running') {
      return 'Processing... (Generating AI link plan)';
    }
    if (jobStatus?.status === 'succeeded') {
      return 'Processing Complete! Link Plan generated.';
    }
    if (jobStatus?.status === 'failed') {
      return `Job Failed: ${jobStatus.error || 'Unknown error'}`;
    }
    if (isProcessing && !jobStatus) {
        return 'Starting...';
    }
    return 'Ready.';
  };

  // Helper to render the JSON plan
  const renderResult = () => {
    if (jobStatus?.status !== 'succeeded' || !jobStatus.result) {
      return null;
    }

    // This is the new part
    const { plan, originalHtml } = jobStatus.result;

    if (plan && Array.isArray(plan)) {
      return (
        <div className="p-4 border rounded-md bg-white">
          <h3 className="font-semibold text-gray-900">AI Link Plan:</h3>
          {plan.length === 0 ? (
            <p className="text-sm text-gray-600">
              No internal linking opportunities found.
            </p>
          ) : (
            <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-x-auto">
              {JSON.stringify(plan, null, 2)}
            </pre>
          )}

          {/* We will build the Diff Viewer here in the next step */}
          <div className="mt-4">
            <h4 className="font-semibold text-gray-900">Next Step:</h4>
            <p className="text-sm text-gray-600">
              Implement the "apply_edits" AI call and a visual diff viewer.
            </p>
          </div>
        </div>
      );
    }

    // Fallback for the old "minimal slice" result
    return (
      <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-x-auto">
        {JSON.stringify(jobStatus.result, null, 2)}
      </pre>
    );
  };


  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">
        Step 3: Process & View Results
      </h2>

      {/* Trigger Button */}
      <button
        onClick={onProcess}
        disabled={isProcessing}
        className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isProcessing ? 'Processing...' : 'Start Processing'}
      </button>

      {/* Status Display */}
      {(isProcessing || jobStatus) && (
        <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
          {isProcessing && !jobStatus?.status && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          )}
          {jobStatus?.status === 'running' && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          )}
          {jobStatus?.status === 'succeeded' && (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          )}
          {(jobStatus?.status === 'failed' || (error && !isProcessing)) && (
            <XCircleIcon className="h-5 w-5 text-red-500" />
          )}
          <p className="text-gray-700">{getStatusMessage()}</p>
        </div>
      )}

      {/* Result Display */}
      {renderResult()}
    </div>
  );
};
