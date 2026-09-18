import type { APIRoute } from 'astro';
import { readBlog } from '../lib/blog.ts';
import { readPhoto } from '../lib/photos.ts';

export const GET: APIRoute = async ({ params }) => {
  if (!import.meta.env.DEV) return new Response('Not found', { status: 404 });
  if (!params.filename) throw new Error('Draft photo route requires a filename');
  const filename = `${params.filename}.webp`;
  const drafts = (await readBlog()).filter(post => post.data.publication_status === 'draft');
  if (!drafts.some(post => post.data.photos?.some(photo => photo.src === filename))) {
    return new Response('Not found', { status: 404 });
  }
  const { bytes } = await readPhoto(filename);
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
};
