import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Honour an assigned PORT (e.g. preview tooling); defaults to Vite's 5173
  server: {
    port: Number(process.env.PORT) || 5173,
  },
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
  // Unit tests (npm test). The security-rules tests in tests/rules need the
  // emulators and run separately (npm run test:rules).
  test: {
    include: ['src/**/*.test.{js,jsx}'],
  },
}))
