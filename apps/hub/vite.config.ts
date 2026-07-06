import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // The previous PWA setup cached index.html and, on redeploys, served a stale
    // shell that referenced missing chunks (white screen) and looped reloads.
    // Ship a self-destroying service worker: it unregisters the old SW and clears
    // its caches for every returning visitor, then the app runs online-only
    // (network) — which is what it needs anyway (auth + backend).
    VitePWA({
      selfDestroying: true,
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
  optimizeDeps: {
    // web-tree-sitter loads its .wasm at runtime (locateFile -> /wasm); keep Vite
    // from trying to pre-bundle/transform it.
    exclude: ['web-tree-sitter'],
  },
})
