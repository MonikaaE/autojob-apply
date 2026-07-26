import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://autojob-apply-production.up.railway.app',
        changeOrigin: true
      },
      '/storage': {
        target: 'https://autojob-apply-production.up.railway.app',
        changeOrigin: true
      }
    }
  }
});
