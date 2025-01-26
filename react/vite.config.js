import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow access from all IPs
    allowedHosts: [
      'localhost',
      '0b21-68-51-113-107.ngrok-free.app'
    ]
  }
})
