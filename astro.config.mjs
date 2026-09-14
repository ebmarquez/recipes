// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  base: '/recipes',
  trailingSlash: 'always',
  build: { format: 'directory' },
  server: { host: '127.0.0.1' },
  devToolbar: { enabled: false },
  // External chunks let Vite finish runtime-import rewriting before Astro emits HTML.
  vite: { build: { assetsInlineLimit: 0 } },
});
