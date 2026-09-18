import { z } from 'zod';
import { text } from './content-fields.ts';

export const photoFilename = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/, 'Use a local imported photo filename such as dinner.webp');
export const photoSchema = z.object({
  src: photoFilename,
  alt: text,
  credit: text,
  caption: text.optional(),
}).strict();
export const photosSchema = z.array(photoSchema).refine(
  photos => new Set(photos.map(photo => photo.src)).size === photos.length,
  'Do not repeat a photo in the same entry',
);
export type Photo = z.infer<typeof photoSchema>;

export function photoHref(filename: string, base: string): string {
  return `${base.replace(/\/?$/, '/')}photos/${photoFilename.parse(filename)}`;
}
