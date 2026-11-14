import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// FastAPI. Override to test another backend: VITE_API_PROXY=http://localhost:8001 npm run dev
const API = process.env.VITE_API_PROXY ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': API,
      // Image URLs are absolute and, through this proxy (string shorthand = changeOrigin), point
      // straight at the backend. /static is proxied too so they also work if they ever point at
      // this origin. In production the backend is configured with PUBLIC_BASE instead.
      '/static': API,
    },
  },
})
