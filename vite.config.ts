import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3002,
    strictPort: true,
    host: '127.0.0.1',
  },
  preview: {
    port: 4174,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    outDir: 'web-dist',
    emptyOutDir: false,
    assetsInlineLimit: 0,
  },
})
