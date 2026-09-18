import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { publicPages, renderSitemap } from '../lib/site.ts';

export const GET: APIRoute = async () => new Response(
  renderSitemap(publicPages(await getCollection('recipes'), await getCollection('blog'))),
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
);
