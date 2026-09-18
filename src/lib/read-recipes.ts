import { join } from 'node:path';
import { validateRecipes } from './recipe-contract.ts';
import { contentDirectory } from './content-directory.ts';
import { readMarkdown } from './read-markdown.ts';

export async function readRecipes(directory = join(contentDirectory(), 'recipes')) {
  return validateRecipes(await readMarkdown(directory));
}
