import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = {
    target: env.VITE_API_PROXY_TARGET || 'https://app.msysconsultgh.com',
    changeOrigin: true,
  }
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true,
      proxy: { '/v1': proxy, '/agent': proxy },
    },
    preview: { host: '0.0.0.0', allowedHosts: true },
  }
})
