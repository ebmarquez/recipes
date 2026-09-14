import { recipeSchema, type Recipe } from '../src/lib/recipe-contract.ts';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDocument } from 'yaml';

export async function copyRecipeTemplate(overrides: Partial<Recipe>) {
  const template = await readFile(join(process.cwd(), '.github', 'skills', 'home-athlete-cooking', 'templates', 'recipe-template.md'), 'utf8');
  const match = template.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error('Recipe authoring template is missing YAML frontmatter');
  const document = parseDocument(match[1]);
  if (document.errors.length) throw new Error(document.errors.map(error => error.message).join('; '));
  for (const [key, value] of Object.entries(overrides)) document.set(key, value);
  return `---\n${document.toString()}---\n${match[2]}`;
}

export const metadata: Recipe = {
  title: 'Test vegetable soup',
  type: 'Recipe',
  slug: 'test-vegetable-soup',
  description: 'Synthetic vegetable soup for automated tests only.',
  publication_status: 'published',
  cuisine: 'Test cuisine',
  category: 'Soup',
  tags: ['recipe', 'test'],
  prep_time: '10 minutes',
  cook_time: 'Variable',
  total_time: 'About an hour',
  yield: '4-6 servings',
  difficulty: 'Easy',
  meal_type: 'Dinner',
  main_ingredients: ['Carrot'],
  key_technique: 'Simmer',
  dietary: [],
  special_notes: '',
  date_created: '2026-09-01',
  date_modified: '2026-09-14',
  prep_minutes: 10,
  cook_minutes: null,
  total_minutes: null,
  servings: 4,
  source_name: 'Synthetic test fixture; not a real recipe',
};

export const body = `## Ingredients

- 1 carrot
- Water

## Instructions

1. Combine the test ingredients.
2. Simmer.

## Notes

- This list must not become checkboxes.
`;

export function entry(overrides: Partial<Recipe> = {}, content = body) {
  const data = recipeSchema.parse({ ...metadata, ...overrides });
  return { filename: `${data.slug}.md`, data, body: content };
}
