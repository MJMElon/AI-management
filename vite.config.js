import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Absolute base for the GitHub Pages project site. This makes asset URLs
// resolve correctly even when the page is opened WITHOUT the trailing slash
// (https://<user>.github.io/AI-management), which relative './' breaks.
export default defineConfig({
  plugins: [react()],
  base: '/AI-management/',
})
