import { z } from 'zod';
import { validateMarkdown } from './recipe-markdown.ts';
import { text } from './content-fields.ts';
import { photosSchema } from './photo-contract.ts';

export { text } from './content-fields.ts';
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const textList = z.array(text);
const minutes = z.number().nonnegative().nullable();
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}, 'Use a real calendar date (YYYY-MM-DD)');
const reserved = new Set(['index', '404', 'recipes', 'blog', 'photos', 'search', 'sources', 'local-drafts', 'pagefind', 'sitemap', 'sitemap.xml', 'robots', 'robots.txt', 'assets', '_astro', 'favicon']);

export function isSafeExternalUrl(value: string): boolean {
  if (/[\s\\\u0000-\u001f\u007f]/.test(value) || !/^https?:\/\//i.test(value)) return false;
  try {
    if (/[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(value))) return false;
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

const recipeMetadataSchema = z.object({
  title: text,
  type: z.literal('Recipe'),
  slug: slugSchema.refine(value => !reserved.has(value), 'Reserved route slug'),
  description: text,
  photos: photosSchema.optional(),
  publication_status: z.enum(['draft', 'published']),
  cuisine: text,
  category: text,
  tags: textList.min(1),
  prep_time: text,
  cook_time: text,
  total_time: text,
  yield: text,
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  meal_type: text,
  main_ingredients: textList.min(1),
  key_technique: text,
  dietary: textList,
  special_notes: z.string(),
  date_created: date,
  date_modified: date,
  date_published: date.nullable().optional(),
  prep_minutes: minutes,
  cook_minutes: minutes,
  total_minutes: minutes,
  servings: z.number().int().positive().nullable(),
  source_name: text,
  source_url: z.string().refine(isSafeExternalUrl, 'URL must be an absolute HTTP(S) URL without credentials, whitespace or backslashes').nullable().optional(),
}).strict();

export const recipeSchema = z.discriminatedUnion('publication_status', [
  recipeMetadataSchema.extend({ publication_status: z.literal('draft'), source_name: text.optional() }),
  recipeMetadataSchema.extend({ publication_status: z.literal('published') }),
]);

export type Recipe = z.infer<typeof recipeSchema>;
export interface RecipeEntry {
  filename: string;
  data: Recipe;
  body: string;
}

export function validateRecipes(input: { filename: string; data: unknown; body: string }[]): RecipeEntry[] {
  const slugs = new Set<string>();
  const titles = new Set<string>();
  const entries = input.map(item => {
    const parsed = recipeSchema.safeParse(item.data);
    if (!parsed.success) throw new Error(`${item.filename}: ${parsed.error.message}`);
    const data = parsed.data;
    if (item.filename !== `${data.slug}.md`) throw new Error(`${item.filename}: filename must match slug "${data.slug}"`);
    if (slugs.has(data.slug)) throw new Error(`${item.filename}: duplicate slug "${data.slug}"`);
    const title = data.title.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
    if (titles.has(title)) throw new Error(`${item.filename}: duplicate title "${data.title}"`);
    slugs.add(data.slug);
    titles.add(title);
    return { ...item, data };
  });
  for (const entry of entries) validateMarkdown(entry, entries);
  return entries;
}
