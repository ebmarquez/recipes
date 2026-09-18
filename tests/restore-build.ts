import { build } from './build-helpers.ts';
import { readRecipes } from '../src/lib/read-recipes.ts';
import { verifyOutput } from '../src/lib/verify-output.ts';
import { readBlog } from '../src/lib/blog.ts';

export default async function restoreBuild() {
  const recipes = await readRecipes();
  const posts = await readBlog(undefined, recipes);
  if ([...recipes, ...posts].some(entry => entry.data.slug.startsWith('test-build-'))) {
    throw new Error('Unexpected test fixture remains. Inspect content before restoring the build.');
  }
  build();
  await verifyOutput();
}
