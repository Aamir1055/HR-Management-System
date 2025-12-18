// Vite configuration file for the PayRoll Management System frontend development server
// Sets up React plugin, API proxy to backend server, and optimizes build dependencies
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  
  // Get backend URL from environment or default to localhost
  const backendUrl = env.VITE_API_BASE_URL || `http://localhost:${env.VITE_BACKEND_PORT || '5000'}`;
  
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      port: parseInt(env.VITE_PORT) || 3000,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: parseInt(env.VITE_PORT) || 3000,
    },
    // Expose environment variables to the client
    define: {
      __API_BASE_URL__: JSON.stringify(backendUrl),
    },
  };
});
