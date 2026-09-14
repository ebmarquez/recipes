import { readRecipes } from '../src/lib/read-recipes.ts';
import { publishedRecipes } from '../src/lib/publication.ts';

try {
  const recipes = await readRecipes();
  console.log(`Validated ${recipes.length} recipes; ${publishedRecipes(recipes).length} included in the private build.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
