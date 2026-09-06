import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server:{
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // Backend jab cluster me ho (default): k8s/ingress.yml port 80 par API routes expose
      // karta hai (/api/sandbox, /api/ai). Local ai-orchestration (port 3000) istemal karne
      // ke liye environment var set karo: PROXY_TARGET=http://localhost:3000
      "/api/":{
        target: process.env.PROXY_TARGET || "http://localhost",
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
