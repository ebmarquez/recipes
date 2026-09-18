import type { Recipe } from './recipe-contract.ts';
import { publishedRecipes, recipeHref } from './publication.ts';
import { publishedPosts, blogHref, type BlogPost } from './blog.ts';

export const SITE_ORIGIN = 'https://ebmarquez.github.io';
export const SITE_BASE = '/recipes/';
export const COLLECTION_NOTE = 'A personal collection of recipes I have made or want to make. Sources are credited and linked where known; not every recipe has been tested.';

export function canonicalUrl(pathname: string): string {
  const url = new URL(pathname, SITE_ORIGIN);
  if (url.origin !== SITE_ORIGIN) throw new Error('Canonical URL must use the cookbook site origin');
  if (!url.pathname.startsWith(SITE_BASE)) throw new Error('Canonical URL must include the cookbook base');
  if (url.search || url.hash) throw new Error('Canonical URL must not include a query or fragment');
  return url.href;
}

export interface SitemapPage {
  url: string;
  lastmod?: string;
}

export function publicPages(recipes: { data: Recipe }[], posts: { data: BlogPost }[] = []): SitemapPage[] {
  return [
    { url: canonicalUrl(SITE_BASE) },
    { url: canonicalUrl(`${SITE_BASE}sources/`) },
    { url: canonicalUrl(`${SITE_BASE}blog/`) },
    { url: canonicalUrl(`${SITE_BASE}search/`) },
    ...publishedRecipes(recipes).toSorted((a, b) => a.data.slug.localeCompare(b.data.slug)).map(({ data }) => ({
      url: canonicalUrl(recipeHref(data.slug, SITE_BASE)),
      lastmod: data.date_modified,
    })),
    ...publishedPosts(posts).map(({ data }) => ({
      url: canonicalUrl(blogHref(data.slug, SITE_BASE)), lastmod: data.date_modified,
    })),
  ];
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]!);
}

export function renderSitemap(pages: SitemapPage[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page =>
    `  <url><loc>${escapeXml(page.url)}</loc>${page.lastmod ? `<lastmod>${escapeXml(page.lastmod)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
}

export function robotsText(): string {
  return `User-agent: *\nAllow: ${SITE_BASE}\n\nSitemap: ${canonicalUrl(`${SITE_BASE}sitemap.xml`)}\n`;
}
