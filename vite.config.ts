import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    fs: {
      allow: [process.cwd()],
      strict: false,
    },
  },
  build: {
    reportCompressedSize: false,
  },
})
