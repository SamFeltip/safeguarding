import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: { alias: { '@': fileURLToPath(new URL('src', import.meta.url)) } },
  server: { port: 5173, strictPort: true },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'auth0', test: /node_modules\/@auth0\//u },
            { name: 'react', test: /node_modules\/(?:react|react-dom|scheduler)\//u },
          ],
        },
      },
    },
  },
});
