import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// One HTML entry that branches on `?win=` at runtime, mirroring the way the
// original Hermes renderer served `?win=basil-overlay`, `?win=basil-tour`, etc.
export default defineConfig({
  base: './',
  build: {
    emptyOutDir: true,
    outDir: 'dist/renderer',
    sourcemap: true
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
})
