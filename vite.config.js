import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps asset paths relative so the build works both at a domain
// root and under a GitHub Pages project subpath (/<repo>/).
export default defineConfig({
  plugins: [react()],
  base: './',
})
