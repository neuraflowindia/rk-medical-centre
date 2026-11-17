import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'node:fs';
import {surfaceManifestPlugin} from './appointment-system/tools/build/surfaces.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profile = JSON.parse(readFileSync(path.join(__dirname, 'appointment-settings/project.json'), 'utf8'));
const publicBookingProfile = Object.fromEntries(['version', 'installation_id', 'environment', 'label'].map(key => [key, profile[key]]));

// Only the faces needed for the first paint are preloaded: the heading face, its italic (every
// page's main heading carries one italic phrase, the largest words on a phone's first screen) and
// the text face. The link carries the built file's hashed name, so it is added here, after the
// bundle is known.
const preloadedFonts=['newsreader-roman-400-600.woff2','newsreader-italic-400-500.woff2','figtree-roman-400-600.woff2'];
export function preloadFontsPlugin(files=preloadedFonts){
  return {name:'preload-first-paint-fonts',apply:'build',transformIndexHtml:{order:'post',handler(html,context){
    const emitted=Object.values(context.bundle||{}).filter(item=>item.type==='asset');
    const links=files.map(wanted=>{
      const asset=emitted.find(item=>[...(item.originalFileNames||[]),...(item.names||[])].some(name=>name.split('/').pop()===wanted));
      if(!asset)throw new Error('A font that must be preloaded was not built: '+wanted);
      return `<link rel="preload" as="font" type="font/woff2" href="/${asset.fileName}" crossorigin>`;
    }).join('\n');
    // After the character set and viewport, before anything that needs the faces.
    const anchor='<meta name="theme-color"';
    if(!html.includes(anchor))throw new Error('The shell lost the place where font preloads go.');
    return html.replace(anchor,links+'\n'+anchor);
  }}};
}

// https://vitejs.dev/config/
export default defineConfig({
  define: { __BOOKING_PROFILE__: JSON.stringify(publicBookingProfile) },
  plugins: [
    react(),
    preloadFontsPlugin(),
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
