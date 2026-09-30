/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// Sur GitHub Pages, l'appli vit dans un sous-dossier (/nom-du-depot/).
// Le déploiement fournit ce chemin via BASE_PATH ; en local, c'est la racine.
const base = process.env.BASE_PATH ?? '/';

const dateVersion = new Date().toLocaleString('fr-FR', {
  timeZone: 'Europe/Paris',
  dateStyle: 'long',
  timeStyle: 'short',
});

export default defineConfig({
  base,
  define: { __DATE_VERSION__: JSON.stringify(dateVersion) },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Paulo veut prendre la place',
        short_name: 'Paulo',
        description: "Jeu de culture générale : Qualifs, Compet' et Défi contre le champion.",
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0620',
        theme_color: '#0b0620',
        icons: [
          { src: 'icons/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Toute l'appli ET toute la banque de questions sont gardées dans l'iPhone (hors ligne).
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { host: true },
  test: { include: ['src/**/*.test.ts'] },
});
