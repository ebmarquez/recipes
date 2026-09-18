import { join, dirname } from 'node:path';
import { validateRecipes } from './recipe-contract.ts';
import { contentDirectory } from './content-directory.ts';
import { readMarkdown } from './read-markdown.ts';
import { validatePhotos } from './photos.ts';

export async function readRecipes(directory = join(contentDirectory(), 'recipes')) {
  const recipes = validateRecipes(await readMarkdown(directory));
  await validatePhotos(recipes, dirname(directory));
  return recipes;
}
