import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
const backendTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/types')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true
      },
      '/storage': {
        target: backendTarget,
        changeOrigin: true
      }
    }
  }
});
