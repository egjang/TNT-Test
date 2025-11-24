import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Allow overriding backend URL via VITE_API_BASE_URL or VITE_BACKEND_URL
  const target = env.VITE_API_BASE_URL || env.VITE_BACKEND_URL || 'http://localhost:8080'
  return {
    plugins: [react()],
    // Serve app under /sales/ in production so asset URLs resolve
    base: mode === 'production' ? '/sales/' : '/',
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
