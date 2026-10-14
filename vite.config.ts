import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// React is only used for the hero island (src/hero); the rest of the site is vanilla JS.
export default defineConfig({
  plugins: [react()],
});
