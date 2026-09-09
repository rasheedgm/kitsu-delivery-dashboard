import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Kitsu serves the built plugin under this fixed path and embeds it in an
// iframe. Use the absolute base so assets resolve whether or not the iframe
// URL has a trailing slash (a relative base breaks on `.../frontend`).
const PLUGIN_BASE = '/api/plugins/delivery_dashboard/frontend/'

export default defineConfig({
  plugins: [vue()],
  base: PLUGIN_BASE,
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    // `npm run dev` proxies API calls to a local Zou server so the dashboard
    // can be developed outside the Kitsu iframe.
    proxy: {
      '/api': {
        target: process.env.ZOU_URL || 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js']
  }
})
