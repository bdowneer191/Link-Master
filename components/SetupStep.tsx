
import React, { useState } from 'react';
import type { Credentials } from '../types';
import { InfoIcon } from './icons';

interface SetupStepProps {
  onStart: (credentials: Credentials, urls: string[]) => void;
}

export const SetupStep: React.FC<SetupStepProps> = ({ onStart }) => {
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [urls, setUrls] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteUrl || !username || !appPassword || !urls) {
      setError('All fields are required.');
      return;
    }
    const urlList = urls.split('\n').map(u => u.trim()).filter(Boolean);
    if (urlList.length === 0) {
      setError('Please provide at least one post URL.');
      return;
    }
    setError('');
    
    // Basic URL validation and cleanup
    let formattedSiteUrl = siteUrl.trim();
    if (formattedSiteUrl.endsWith('/')) {
        formattedSiteUrl = formattedSiteUrl.slice(0, -1);
    }
    if (!formattedSiteUrl.startsWith('http')) {
        formattedSiteUrl = 'https' + '://' + formattedSiteUrl;
    }


    onStart({ siteUrl: formattedSiteUrl, username, appPassword }, urlList);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-cyan-300 border-b border-cyan-300/20 pb-2">1. WordPress Site Details</h2>
             <div>
                <label htmlFor="siteUrl" className="block text-sm font-medium text-gray-300">Site URL</label>
                <input
                type="text"
                id="siteUrl"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                />
            </div>
            <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300">WordPress Username</label>
                <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                />
            </div>
            <div>
                <label htmlFor="appPassword" className="block text-sm font-medium text-gray-300">Application Password</label>
                <input
                type="password"
                id="appPassword"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                />
                 <p className="mt-2 text-xs text-gray-500 flex items-start gap-1.5">
                    <InfoIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>You can generate an Application Password in your WordPress profile under 'Users'. This is more secure than using your main password.</span>
                </p>
            </div>
        </div>
        <div className="space-y-4 flex flex-col">
           <h2 className="text-2xl font-semibold text-cyan-300 border-b border-cyan-300/20 pb-2">2. Post URLs to Enhance</h2>
            <div className="flex-grow flex flex-col">
                <label htmlFor="urls" className="block text-sm font-medium text-gray-300">Paste one URL per line</label>
                <textarea
                id="urls"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="https://example.com/blog/post-one&#10;https://example.com/blog/post-two"
                className="mt-1 block w-full flex-grow bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                rows={8}
                />
            </div>
        </div>
      </div>
      
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center items-center py-2 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-all duration-200 transform hover:scale-105"
        >
          Start Processing
        </button>
      </div>
    </form>
  );
};
