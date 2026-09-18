import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { publishedPhotoNames, readPhoto } from '../../lib/photos.ts';

export async function getStaticPaths() {
  const entries = [...await getCollection('recipes'), ...await getCollection('blog')];
  return publishedPhotoNames(entries).map(filename => ({ params: { filename: filename.slice(0, -'.webp'.length) } }));
}

export const GET: APIRoute = async ({ params }) => {
  if (!params.filename) throw new Error('Photo route requires a filename');
  const { bytes } = await readPhoto(`${params.filename}.webp`);
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/webp' } });
};
