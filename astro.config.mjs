import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
    }),
  ],
});
