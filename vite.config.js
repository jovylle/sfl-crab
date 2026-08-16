// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

/**
 * Where /api/* is proxied when using `npm run dev:vite` (not `netlify dev`).
 * Set VITE_API_PROXY_TARGET=http://localhost:8888 to avoid hitting production functions.
 */
const defaultApiProxy = 'https://beta.d1g.uk'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || defaultApiProxy

  return {
  define: {
    __APP_VERSION__: JSON.stringify(process.env.COMMIT_REF || '')
  },
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      assets: path.resolve(__dirname, "src_other/assets"),
      lib: path.resolve(__dirname, "src_other/lib"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        digging: path.resolve(__dirname, 'digging/index.html'),
      }
    }
  },
  server: {
    // Listen on all interfaces so the dev server is reachable from other
    // tailnet devices, e.g. http://minipc.bongo-major.ts.net:5173 (Vite
    // proxies /api and /.netlify/functions to the local Netlify functions
    // below, so the full stack works without exposing netlify dev itself).
    host: true,
    // Vite 6 blocks Host headers not in its allowlist (raw IPs pass, hostnames
    // like the tailnet MagicDNS name get 403). This is a private dev server —
    // allow any hostname. LAN .local names, tailnet names, whatever.
    allowedHosts: true,
    proxy: {
      // Local Netlify functions (hub-auth not on remote beta site)
      '/api/hub-auth': {
        target: env.VITE_NETLIFY_DEV_URL || 'http://localhost:8888',
        changeOrigin: true,
      },
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/.netlify/functions': {
        target: env.VITE_NETLIFY_DEV_URL || 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
  }
})