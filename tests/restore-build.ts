import { build } from './build-helpers.ts';
import { readRecipes } from '../src/lib/read-recipes.ts';

export default async function restoreBuild() {
  const recipes = await readRecipes();
  if (recipes.some(recipe => recipe.data.slug.startsWith('test-pilot-'))) {
    throw new Error('Unexpected test fixture remains. Inspect content before restoring the build.');
  }
  build();
}
