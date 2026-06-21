import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50 MB — covers DuckDB WASM (~42 MB max)
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // LocateMe engine — shared browser-safe core from packages/locateme
      '@locateme/core': path.resolve(__dirname, '../../packages/locateme/src/core'),
    },
  },
  server: {
    fs: {
      // allow importing the LocateMe core source from the monorepo root
      allow: [path.resolve(__dirname, '../..')],
    },
  },
})