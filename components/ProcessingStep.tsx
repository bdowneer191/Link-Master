
import React, { useState, useEffect, useCallback } from 'react';
import type { Credentials, PostURL } from '../types';
import { useSeoWorkflow } from '../hooks/useSeoWorkflow';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, SparklesIcon, ArrowPathIcon } from './icons';

interface ProcessingStepProps {
  credentials: Credentials;
  initialUrls: PostURL[];
  onComplete: () => void;
}

const StatusIcon: React.FC<{ status: PostURL['status'] }> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <ClockIcon className="h-5 w-5 text-gray-500" />;
    case 'processing':
      return <ArrowPathIcon className="h-5 w-5 text-cyan-400 animate-spin" />;
    case 'completed':
      return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
    case 'error':
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
    default:
      return null;
  }
};

export const ProcessingStep: React.FC<ProcessingStepProps> = ({ credentials, initialUrls, onComplete }) => {
  const [urls, setUrls] = useState<PostURL[]>(initialUrls);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const updateUrlStatus = useCallback((index: number, status: PostURL['status'], message: string) => {
    setUrls(prev =>
      prev.map((item, i) => (i === index ? { ...item, status, message } : item))
    );
  }, []);

  const { processUrl, isLoading, log } = useSeoWorkflow(credentials);

  useEffect(() => {
    if (isProcessing && currentIndex < urls.length) {
      const currentUrl = urls[currentIndex];
      updateUrlStatus(currentIndex, 'processing', 'Starting enhancement...');

      processUrl(currentUrl.url)
        .then(result => {
          updateUrlStatus(currentIndex, 'completed', result);
          setCurrentIndex(prev => prev + 1);
        })
        .catch(error => {
          updateUrlStatus(currentIndex, 'error', error.message || 'An unknown error occurred.');
          setCurrentIndex(prev => prev + 1); // Move to the next one even on error
        });
    } else if (currentIndex >= urls.length && isProcessing) {
      setIsProcessing(false);
      setIsFinished(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isProcessing, urls.length]);

  const handleStart = () => {
    setIsProcessing(true);
    setCurrentIndex(0);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-cyan-300">Processing Posts</h2>
        {!isProcessing && !isFinished && (
          <button onClick={handleStart} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md text-white font-medium transition-colors">
            Start
          </button>
        )}
        {isFinished && (
          <button onClick={onComplete} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-medium transition-colors">
            Start Over
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* URL List */}
        <div className="space-y-2 pr-4 border-r border-gray-700/50">
           <h3 className="text-lg font-medium text-gray-300 mb-3">URL Queue</h3>
          {urls.map((item, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg flex items-start gap-3 text-sm transition-all duration-300 ${
                currentIndex === index && isProcessing ? 'bg-cyan-900/50 scale-105 shadow-lg' : 'bg-gray-800'
              }`}
            >
              <div className="pt-0.5"><StatusIcon status={item.status} /></div>
              <div className="flex-1">
                <p className="font-mono break-all text-gray-400">{item.url}</p>
                <p className="text-gray-300 mt-1">{item.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Live Log */}
        <div className="flex flex-col">
            <h3 className="text-lg font-medium text-gray-300 mb-3">Live Log</h3>
            <div className="bg-black/30 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm space-y-2 flex-grow">
            {!isProcessing && !isFinished && <p className="text-gray-500">Click 'Start' to begin processing...</p>}
            {isFinished && <p className="text-green-400">All posts processed! ✨</p>}
            {log ? (
              <>
                <p className={`whitespace-pre-wrap break-words ${
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'success' ? 'text-green-400' : 'text-gray-400'
                }`}>
                    [{new Date().toLocaleTimeString()}] {log.postUrl ? `(${log.postUrl.substring(log.postUrl.lastIndexOf('/') + 1)})` : ''}
                </p>
                <p className="whitespace-pre-wrap break-words pl-4">{log.message}</p>
              </>
            ) : isProcessing ? (
                <p className="text-gray-500">Processing... please wait.</p>
            ): null}
            </div>
        </div>

      </div>
    </div>
  );
};
