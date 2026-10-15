import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'node:fs';
import {surfaceManifestPlugin} from './appointment-system/tools/build/surfaces.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profile = JSON.parse(readFileSync(path.join(__dirname, 'appointment-settings/project.json'), 'utf8'));
const publicBookingProfile = Object.fromEntries(['version', 'installation_id', 'environment', 'label'].map(key => [key, profile[key]]));

// https://vitejs.dev/config/
export default defineConfig({
  define: { __BOOKING_PROFILE__: JSON.stringify(publicBookingProfile) },
  plugins: [
    react(),
    tailwindcss(),
    surfaceManifestPlugin({bookingModules:['src/booking/clinic-booking.jsx']}),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    watch: { usePolling: true, interval: 1000, ignored: ['**/public/**','**/appointment-system/**','**/node_modules/**','**/dist/**'] },
    host: '127.0.0.1',
    port: 4200,
    strictPort: true,
    open: false,
  },
});
