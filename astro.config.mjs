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
  integrations: [{
    name: 'local-draft-preview',
    hooks: {
      'astro:config:setup': ({ command, injectRoute, updateConfig }) => {
        if (command !== 'dev') return;
        // Let draft pages redirect missing slashes before Astro rejects the request.
        updateConfig({ trailingSlash: 'ignore' });
        injectRoute({ pattern: '/local-drafts/[...slug]', entrypoint: './src/preview/blog.astro', prerender: false });
        injectRoute({ pattern: '/local-drafts/photos/[filename].webp', entrypoint: './src/preview/photo.ts', prerender: false });
      },
    },
  }],
  // External chunks let Vite finish runtime-import rewriting before Astro emits HTML.
  vite: { build: { assetsInlineLimit: 0 } },
});
