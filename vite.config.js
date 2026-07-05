import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  // Remove console.* and debugger statements in production builds only
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
  },
  build: {
    sourcemap: false,          // never emit source maps — hides original source from DevTools
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase':     ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'docx':         ['docx', 'file-saver'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
}))
