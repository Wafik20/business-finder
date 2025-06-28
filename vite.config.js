import { defineConfig } from 'vite'

export default defineConfig({
  // Base public path when served in production
  base: './',
  
  // Development server configuration
  server: {
    port: 8000,
    open: true,
    host: true
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
}) 