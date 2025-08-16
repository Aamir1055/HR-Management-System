// Vite configuration file for the PayRoll Management System frontend development server
// Sets up React plugin, API proxy to backend server, and optimizes build dependencies
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
