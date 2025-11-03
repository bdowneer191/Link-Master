/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import vercel from 'vite-plugin-vercel';

export default defineConfig(({ mode }) => {
    // Load env file based on mode
    const env = loadEnv(mode, process.cwd(), '');

    // Expose all env variables to vitest
    process.env = {...process.env, ...env};

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), vercel()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        globals: true,
        environment: 'node',
      }
    };
});
