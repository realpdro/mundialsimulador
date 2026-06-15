import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// lastmod veraz: la fecha de última actualización REAL de los datos (no la del build).
let LASTMOD;
try { LASTMOD = JSON.parse(readFileSync('./src/data/results.json', 'utf8')).updatedAt; } catch {}
LASTMOD = LASTMOD || '2026-06-11T00:00:00.000Z';

// IMPORTANTE: cambia `site` por tu dominio real cuando lo tengas.
// Afecta a las URLs absolutas del sitemap, canonical y Open Graph.
export default defineConfig({
  site: 'https://mundialsimulador.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es-ES', en: 'en', pt: 'pt' },
      },
      filter: (page) => !page.includes('/og/'),
      serialize(item) {
        item.lastmod = LASTMOD;
        return item;
      },
    }),
  ],
});
