import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'https://agromitra-ytqb.onrender.com/api'),
    'import.meta.env.VITE_PRODUCTION_API_URL': JSON.stringify(process.env.VITE_PRODUCTION_API_URL || 'https://agromitra-ytqb.onrender.com/api'),
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    watch: {
      ignored: ['**/android/**', '**/dist/**', '**/.gradle/**']
    }
  },
  preview: {
    port: 4173,
    host: '0.0.0.0'
  }
});
