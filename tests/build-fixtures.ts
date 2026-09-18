import { entry } from './fixtures.ts';
import type { Source } from '../src/lib/sources.ts';
import type { BlogEntry } from '../src/lib/blog.ts';

export const TEST_ORIGIN = 'http://127.0.0.1:4332';
export const TEST_URL = `${TEST_ORIGIN}/recipes/`;
export const HIDDEN_RECIPE = 'test-build-hidden-recipe';
export const INGREDIENT_QUERY = 'Searchonlyparsley';
export const EXTERNAL_QUERY = 'Qzxexternalreference';
export const BLOG_QUERY = 'Qzxkitchennarrative';
export const HIDDEN_BLOG = 'test-build-hidden-blog';
export const BLOG_PHOTO = 'test-build-blog-photo.webp';
export const RECIPE_PHOTO = 'test-build-recipe-photo.webp';
export const HIDDEN_PHOTO = 'test-build-hidden-photo.webp';
export const UNUSED_PHOTO = 'test-build-unused-photo.webp';

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
    photos: [{ src: RECIPE_PHOTO, alt: 'Synthetic recipe photo', credit: 'Synthetic image for testing.' }],
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
  HIDDEN_BLOG, 'DRAFTBLOGTITLESENTINEL', 'DRAFTBLOGDESCRIPTIONSENTINEL', 'DRAFTBLOGBODYSENTINEL',
  HIDDEN_PHOTO, UNUSED_PHOTO, 'DRAFTPHOTOALTSENTINEL',
];

export const blogFixtures: BlogEntry[] = [
  {
    filename: 'test-build-kitchen-note.md',
    data: {
      title: 'Synthetic kitchen note', slug: 'test-build-kitchen-note',
      description: 'Synthetic dinner prose for browser tests, not an actual meal.',
      publication_status: 'published', date_created: '2026-09-17', date_modified: '2026-09-17',
      date_published: '2026-09-17', featured_recipe: 'test-build-thirty-minute-main',
      photos: [{ src: BLOG_PHOTO, alt: 'Synthetic blog photo', credit: 'Synthetic image for testing.', caption: 'Photo caption fixture.' }],
    },
    body: `## Kitchen notes

${BLOG_QUERY} ${INGREDIENT_QUERY}

[Recipe directions](../../test-build-thirty-minute-main/#directions)
[Earlier note](../test-build-earlier-note/)
[Future post](../${HIDDEN_BLOG}/)
[Future dish](../../${HIDDEN_RECIPE}/)
`,
  },
  {
    filename: 'test-build-earlier-note.md',
    data: {
      title: 'Synthetic earlier note', slug: 'test-build-earlier-note',
      description: 'An older synthetic post without a featured recipe.',
      publication_status: 'published', date_created: '2026-09-16', date_modified: '2026-09-16',
      date_published: '2026-09-16', featured_recipe: null,
    },
    body: '## Kitchen notes\n\nTest-only text, not a real cooking experience.',
  },
];
