import { defineCollection } from 'astro:content';
import type { Loader } from 'astro/loaders';
import { fileURLToPath } from 'node:url';
import { relative, isAbsolute, join } from 'node:path';
import { recipeSchema } from './lib/recipe-contract.ts';
import { readRecipes } from './lib/read-recipes.ts';
import { publishedRecipes } from './lib/publication.ts';
import { renderRecipe, renderBlog } from './lib/recipe-markdown.ts';
import { contentDirectory } from './lib/content-directory.ts';
import { blogSchema, publishedPosts, readBlog } from './lib/blog.ts';

function approvedRecipeLoader(): Loader {
  return {
    name: 'approved-cookbook-recipes',
    async load({ store, parseData, config, watcher, logger }) {
      const directory = join(contentDirectory(fileURLToPath(config.root)), 'recipes');
      async function sync() {
        const all = await readRecipes(directory);
        const entries = await Promise.all(publishedRecipes(all).map(async recipe => ({
          id: recipe.data.slug,
          data: await parseData({ id: recipe.data.slug, data: recipe.data }),
          rendered: await renderRecipe(recipe, all, config.base),
        })));
        // Only approved entries and transformed HTML enter Astro's content store.
        store.clear();
        for (const entry of entries) store.set(entry);
      }
      await sync();
      let pending = Promise.resolve();
      watcher?.add(directory);
      watcher?.on('all', (_event, path) => {
        const child = relative(directory, path);
        if (child.startsWith('..') || isAbsolute(child) || !child.endsWith('.md')) return;
        pending = pending.then(sync).catch(error => {
          store.clear();
          logger.error(error instanceof Error ? error.message : String(error));
        });
      });
    },
  };
}

export const collections = {
  recipes: defineCollection({ loader: approvedRecipeLoader(), schema: recipeSchema }),
  blog: defineCollection({ loader: approvedBlogLoader(), schema: blogSchema }),
};

function approvedBlogLoader(): Loader {
  return {
    name: 'approved-cookbook-blog',
    async load({ store, parseData, config, watcher, logger }) {
      const root = contentDirectory(fileURLToPath(config.root));
      const directories = [join(root, 'blog'), join(root, 'recipes')];
      async function sync() {
        const recipes = await readRecipes(directories[1]);
        const posts = await readBlog(root, recipes);
        const entries = await Promise.all(publishedPosts(posts).map(async post => ({
          id: post.data.slug,
          data: await parseData({ id: post.data.slug, data: post.data }),
          rendered: await renderBlog(post, recipes, posts, config.base),
        })));
        store.clear();
        for (const entry of entries) store.set(entry);
      }
      await sync();
      let pending = Promise.resolve();
      watcher?.add(directories);
      watcher?.on('all', (_event, path) => {
        if (!directories.some(directory => {
          const child = relative(directory, path);
          return !child.startsWith('..') && !isAbsolute(child) && child.endsWith('.md');
        })) return;
        pending = pending.then(sync).catch(error => {
          store.clear();
          logger.error(error instanceof Error ? error.message : String(error));
        });
      });
    },
  };
}
