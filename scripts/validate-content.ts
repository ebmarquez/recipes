import { readRecipes } from '../src/lib/read-recipes.ts';
import { publishedRecipes } from '../src/lib/publication.ts';
import { readSources, publishedSources } from '../src/lib/sources.ts';

try {
  const recipes = await readRecipes();
  const sources = await readSources();
  console.log(`Validated ${recipes.length} recipes (${publishedRecipes(recipes).length} published) and ${sources.length} source references (${publishedSources(sources).length} published).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
