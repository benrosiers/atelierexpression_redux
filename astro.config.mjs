import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://atelierexpression.ca',

  integrations: [
    sitemap({
      // Keep in sync with the Disallow rule in public/robots.txt
      filter: (page) => !page.includes('/mentions-legales'),
    }),
  ],

  // Le serveur reste accessible uniquement depuis cette machine.
  server: {
    host: '127.0.0.1',
    port: 4321,
  },

  // Autorisation temporaire des domaines générés par Cloudflare Tunnel.
  // Sûr ici car le serveur n'écoute que sur 127.0.0.1 (ligne ci-dessus) —
  // Cloudflare Tunnel s'y connecte en sortant, aucun port n'est ouvert.
  // À restreindre avant un vrai déploiement public (voir
  // docs/admin/stable-access-recommendation.md).
  vite: {
    server: {
      allowedHosts: true,
    },
  },
});