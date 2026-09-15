import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { text, slugSchema, isSafeExternalUrl } from './recipe-contract.ts';
import { isPublished } from './publication.ts';
import { contentDirectory } from './content-directory.ts';

export const sourceSchema = z.object({
  slug: slugSchema,
  title: text,
  description: text,
  source_name: text,
  source_url: z.string().refine(isSafeExternalUrl, 'Use a safe, absolute HTTP(S) source URL'),
  cuisine: text,
  category: text,
  publication_status: z.enum(['draft', 'published']),
}).strict();

export type Source = z.infer<typeof sourceSchema>;

export function validateSources(input: unknown): Source[] {
  const parsed = z.array(sourceSchema).safeParse(input);
  if (!parsed.success) throw new Error(`sources.json: ${parsed.error.message}`);
  const slugs = new Set<string>();
  for (const source of parsed.data) {
    if (slugs.has(source.slug)) throw new Error(`sources.json: duplicate source slug "${source.slug}"`);
    slugs.add(source.slug);
  }
  return parsed.data;
}

export async function readSources(path = join(contentDirectory(), 'sources.json')): Promise<Source[]> {
  const raw = await readFile(path, 'utf8');
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${path}: invalid source JSON`, { cause: error });
  }
  return validateSources(input);
}

export function publishedSources(sources: Source[]): Source[] {
  return sources.filter(isPublished).toSorted((a, b) => a.title.localeCompare(b.title));
}
