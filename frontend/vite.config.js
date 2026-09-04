import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En `npm run dev` no hay nginx delante: las URLs de imágenes que devuelve
    // el backend ("/uploads/...") son relativas y, sin esto, el navegador las
    // pediría contra el propio Vite (5173) en vez del backend (4000) — igual
    // que en producción hace el nginx del frontend (ver frontend/nginx.conf).
    proxy: {
      '/uploads': 'http://localhost:4000',
    },
  },
})
