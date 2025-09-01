import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000, // เพิ่ม limit เป็น 1MB
    rollupOptions: {
      output: {
        manualChunks: {
          // แยก vendor libraries
          vendor: ['react', 'react-dom'],
          // แยก UI components
          ui: [
            './src/components/ui/button',
            './src/components/ui/avatar',
            './src/components/ui/tabs',
            './src/components/ui/dialog',
            './src/components/ui/toast'
          ],
          // แยก services
          services: [
            './src/services/membershipAPI',
            './src/services/profileAPI',
            './src/services/paymentAPI',
            './src/services/feelfreepayAPI'
          ]
        }
      }
    }
  }
})
