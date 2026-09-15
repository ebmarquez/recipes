import { entry } from './fixtures.ts';
import type { Source } from '../src/lib/sources.ts';

export const TEST_ORIGIN = 'http://127.0.0.1:4332';
export const TEST_URL = `${TEST_ORIGIN}/recipes/`;
export const HIDDEN_RECIPE = 'test-build-hidden-recipe';
export const INGREDIENT_QUERY = 'Searchonlyparsley';
export const EXTERNAL_QUERY = 'Qzxexternalreference';

const body = `## Ingredients

- 1 spoon test ingredient
- Water

## Instructions

1. Combine the synthetic ingredients.
2. Finish the synthetic preparation.

## Notes

- Not a recipe intended for publication.
`;

export const publishedFixtures = [
  entry({
    slug: 'test-build-variable-soup', title: 'Synthetic variable-time soup',
    category: 'Fixture Soup', cuisine: 'Fixture Italian',
    date_published: '2026-09-14',
  }, `${body}\n[Future recipe](../${HIDDEN_RECIPE}/)`),
  entry({
    slug: 'test-build-thirty-minute-main', title: 'Synthetic thirty-minute main',
    source_url: 'https://example.com/attributed-recipe-fixture',
    category: 'Fixture Main', cuisine: 'Fixture Japanese',
    total_minutes: 30, total_time: '30 minutes', cook_minutes: 20,
    date_published: '2026-09-14',
  }, `## Ingredients

- 1 spoon ${INGREDIENT_QUERY}
- Water

## Instructions

### Step 1: Combine

Combine the synthetic ingredients.

### Step 2: Finish

Finish the synthetic preparation.

## Notes

- A non-ingredient list must not have checkboxes.
`),
  entry({
    slug: 'test-build-zero-cook-side', title: 'Synthetic no-cook side',
    category: 'Fixture Side', cuisine: 'Fixture Mexican',
    total_minutes: 10, total_time: '10 minutes', cook_minutes: 0, cook_time: '0 minutes',
    date_published: '2026-09-14',
  }, body),
  entry({
    slug: 'test-build-long-main', title: 'Synthetic over-thirty-minute main',
    category: 'Fixture Main', cuisine: 'Fixture Japanese',
    total_minutes: 31, total_time: '31 minutes', cook_minutes: 21,
    date_published: '2026-09-14',
  }, body),
];

export const sourceFixtures: Source[] = [
  {
    slug: 'test-build-public-source', title: EXTERNAL_QUERY,
    description: 'External reference fixture. The method remains at the original source.',
    source_name: 'Example source creator', source_url: 'https://example.com/test-build-public-source',
    cuisine: 'Fixture French', category: 'Guide', publication_status: 'published',
  },
  {
    slug: 'test-build-hidden-source', title: 'DRAFTSOURCETITLESENTINEL',
    description: 'DRAFTSOURCEDESCRIPTIONSENTINEL',
    source_name: 'DRAFTSOURCECREATORSENTINEL', source_url: 'https://example.com/test-build-hidden-source',
    cuisine: 'DRAFTSOURCECUISINESENTINEL', category: 'Guide', publication_status: 'draft',
  },
];

export const draftSentinels = [
  HIDDEN_RECIPE, 'DRAFTRECIPETITLESENTINEL', 'DRAFTRECIPEDESCRIPTIONSENTINEL',
  'DRAFTRECIPEINGREDIENTSENTINEL', 'DRAFTRECIPEBODYSENTINEL',
  'test-build-hidden-source', 'DRAFTSOURCETITLESENTINEL', 'DRAFTSOURCEDESCRIPTIONSENTINEL',
  'DRAFTSOURCECREATORSENTINEL', 'DRAFTSOURCECUISINESENTINEL',
];
