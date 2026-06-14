import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        // Split big, rarely-changing libraries into their own chunks. Their content hash
        // stays stable across app deploys, so returning users (and the SW cache) only
        // re-download the small app chunk when we ship an update — not the whole bundle.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-agora': ['agora-rtc-sdk-ng'],
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  }
})
