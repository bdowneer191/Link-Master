
import React, { useState } from 'react';
import { SetupStep } from './components/SetupStep';
import { ProcessingStep } from './components/ProcessingStep';
import type { Credentials, PostURL } from './types';
import { LogoIcon } from './components/icons';


const App: React.FC = () => {
  const [step, setStep] = useState<'setup' | 'processing'>('setup');
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [postUrls, setPostUrls] = useState<PostURL[]>([]);

  const handleStartProcessing = (creds: Credentials, urls: string[]) => {
    setCredentials(creds);
    setPostUrls(urls.map(url => ({ url, status: 'pending', message: 'Waiting...' })));
    setStep('processing');
  };
  
  const handleReset = () => {
    setCredentials(null);
    setPostUrls([]);
    setStep('setup');
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
                <LogoIcon className="h-12 w-12 text-cyan-400" />
                <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">
                    AI SEO Link Assistant
                </h1>
            </div>
            <p className="text-gray-400 max-w-2xl mx-auto">
                Automate internal and external link building for your WordPress posts. Provide your site details, paste post URLs, and let AI enhance your content.
            </p>
        </header>

        <main className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-black/20 ring-1 ring-white/10 p-6 sm:p-8">
          {step === 'setup' && <SetupStep onStart={handleStartProcessing} />}
          {step === 'processing' && credentials && (
            <ProcessingStep
              credentials={credentials}
              initialUrls={postUrls}
              onComplete={handleReset}
            />
          )}
        </main>
        
        <footer className="text-center mt-8 text-sm text-gray-500">
            <p>Powered by Gemini API</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
