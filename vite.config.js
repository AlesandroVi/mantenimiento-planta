import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: el mismo build funciona en GitHub Pages (subcarpeta) y en local.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // supabase-js ocupa la mayor parte del bundle (~150 kB comprimido en total).
  build: { chunkSizeWarningLimit: 600 },
})
