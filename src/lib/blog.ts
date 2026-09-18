import { join } from 'node:path';
import { z } from 'zod';
import { date, slugSchema, text, type RecipeEntry } from './recipe-contract.ts';
import { validateBlogMarkdown } from './recipe-markdown.ts';
import { readMarkdown } from './read-markdown.ts';
import { readRecipes } from './read-recipes.ts';
import { contentDirectory } from './content-directory.ts';
import { isPublished, recipeHref } from './publication.ts';

const metadata = z.object({
  title: text,
  slug: slugSchema.refine(value => value !== 'index', 'Reserved blog route slug'),
  description: text,
  date_created: date,
  date_modified: date,
  featured_recipe: slugSchema.nullable(),
}).strict();

export const blogSchema = z.discriminatedUnion('publication_status', [
  metadata.extend({ publication_status: z.literal('draft'), date_published: z.null() }),
  metadata.extend({ publication_status: z.literal('published'), date_published: date }),
]);

export type BlogPost = z.infer<typeof blogSchema>;
export interface BlogEntry { filename: string; data: BlogPost; body: string }

export function validateBlog(input: { filename: string; data: unknown; body: string }[], recipes: RecipeEntry[]): BlogEntry[] {
  const slugs = new Set<string>();
  const titles = new Set<string>();
  const posts = input.map(item => {
    const label = `blog/${item.filename}`;
    const parsed = blogSchema.safeParse(item.data);
    if (!parsed.success) throw new Error(`${label}: ${parsed.error.message}`);
    const data = parsed.data;
    if (item.filename !== `${data.slug}.md`) throw new Error(`${label}: filename must match slug "${data.slug}"`);
    if (slugs.has(data.slug)) throw new Error(`${label}: duplicate slug "${data.slug}"`);
    const title = data.title.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
    if (titles.has(title)) throw new Error(`${label}: duplicate title "${data.title}"`);
    slugs.add(data.slug);
    titles.add(title);
    if (data.featured_recipe !== null) {
      const recipe = recipes.find(item => item.data.slug === data.featured_recipe);
      if (!recipe) throw new Error(`${label}: featured_recipe "${data.featured_recipe}" does not exist`);
      if (isPublished(data) && !isPublished(recipe.data)) {
        throw new Error(`${label}: featured_recipe must be published before the post is published`);
      }
    }
    return { ...item, data };
  });
  for (const post of posts) {
    validateBlogMarkdown({ ...post, filename: `blog/${post.filename}` }, recipes, posts);
  }
  return posts;
}

export async function readBlog(directory = contentDirectory(), recipes?: RecipeEntry[]) {
  return validateBlog(await readMarkdown(join(directory, 'blog')), recipes ?? await readRecipes(join(directory, 'recipes')));
}

export function publishedPosts<T extends { data: BlogPost }>(posts: T[]): T[] {
  return posts.filter(({ data }) => isPublished(data)).toSorted((a, b) =>
    (b.data.date_published ?? '').localeCompare(a.data.date_published ?? '') || a.data.slug.localeCompare(b.data.slug));
}

export function blogHref(slug: string, base: string): string {
  return recipeHref(`blog/${slug}`, base);
}
