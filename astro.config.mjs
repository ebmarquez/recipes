// @ts-check
import { defineConfig } from 'astro/config';
import { SITE_ORIGIN, SITE_BASE } from './src/lib/site.ts';

export default defineConfig({
  output: 'static',
  site: SITE_ORIGIN,
  base: SITE_BASE,
  trailingSlash: 'always',
  build: { format: 'directory' },
  server: { host: '127.0.0.1' },
  devToolbar: { enabled: false },
  // External chunks let Vite finish runtime-import rewriting before Astro emits HTML.
  vite: { build: { assetsInlineLimit: 0 } },
});
