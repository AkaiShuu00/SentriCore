import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',

    // Payagan ang kasalukuyang ngrok URL + kahit anong .ngrok-free.dev / .app
    // (para hindi na kailangang i-edit tuwing magbabago ang tunnel URL)
    allowedHosts: [
      'mutation-conjuror-employee.ngrok-free.dev',
      '.ngrok-free.dev',
      '.ngrok-free.app',
    ],

    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})