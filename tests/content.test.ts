import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recipeSchema, validateRecipes } from '../src/lib/recipe-contract.ts';
import { publishedRecipes, recipeHref, recentRecipes, matchesFilters } from '../src/lib/publication.ts';
import { renderRecipe } from '../src/lib/recipe-markdown.ts';
import { body, entry, metadata } from './fixtures.ts';

test('contract preserves human yield range, null times and zero-minute cook', () => {
  const parsed = recipeSchema.parse({ ...metadata, cook_minutes: 0, date_published: null });
  assert.equal(parsed.yield, '4-6 servings');
  assert.equal(parsed.cook_minutes, 0);
  assert.equal(parsed.total_minutes, null);
  assert.equal(parsed.date_published, null);
});

test('invalid metadata is rejected with field paths', () => {
  for (const bad of [
    { title: '' }, { publication_status: 'public' }, { type: 'Article' },
    { prep_minutes: -1 }, { cook_minutes: Infinity }, { total_minutes: NaN },
    { total_minutes: -1 }, { servings: 0 }, { servings: 2.5 },
    { main_ingredients: [] }, { cuisine: '' }, { date_created: '2026-02-30' },
    { date_published: 'yesterday' }, { difficulty: 'Impossible' }, { source_name: '' },
    { source_url: 'javascript:alert(1)' }, { source_url: '//example.com' },
    { source_url: 'https://user:password@example.com' }, { source_url: 'not a url' },
    { source_url: 'https://example.com\\bad' }, { source_url: 'https://example.com/ bad' },
    { source_url: 'https://example.com/%0a' }, { source_url: 'https://example.com/%xy' },
    { description: undefined }, { slug: 'Bad Slug' }, { title: '<script>bad</script>' },
  ]) {
    const result = recipeSchema.safeParse({ ...metadata, ...bad });
    assert.equal(result.success, false, JSON.stringify(bad));
    if (!result.success) assert.ok(result.error.issues[0].path.length);
  }
});

test('source URL accepts normal HTTPS with optional published date', () => {
  assert.ok(recipeSchema.safeParse({ ...metadata, source_url: 'https://example.com/recipe?x=1#notes' }).success);
});

test('filenames, duplicate normalized titles and reserved/colliding slugs fail', () => {
  for (const slug of ['index', 'pagefind', 'sitemap.xml', '404', 'recipes', 'search']) {
    assert.throws(() => validateRecipes([entry({ slug })]), /slug/i);
  }
  assert.throws(() => validateRecipes([{ ...entry(), filename: 'other.md' }]), /filename/i);
  assert.throws(() => validateRecipes([entry(), entry()]), /duplicate/i);
  assert.throws(() => validateRecipes([entry(), entry({ slug: 'second', title: ' TEST vegetable SOUP ' })]), /title/i);
});

test('required cooking sections and ingredient/direction lists are validated', () => {
  for (const content of ['', '## Ingredients\n\nWater', '## Instructions\n\n1. Cook',
    '## Ingredients\n\n- Water\n\n## Instructions\n\nCook it.']) {
    assert.throws(() => validateRecipes([entry({}, content)]), /Ingredients|Instructions|Directions/);
  }
});

test('published selection, recent fallback and base-aware routes are centralized', () => {
  const entries = [entry(), entry({ slug: 'hidden', title: 'Hidden', publication_status: 'draft' })];
  assert.deepEqual(publishedRecipes(entries).map(r => r.data.slug), [metadata.slug]);
  assert.equal(recipeHref('calabacitas', '/recipes/'), '/recipes/calabacitas/');
  assert.equal(recipeHref('calabacitas', '/'), '/calabacitas/');
  assert.equal(recipeHref('calabacitas', '/recipes'), '/recipes/calabacitas/');
  const recent = entry({ slug: 'recent', title: 'Recent', date_modified: '2026-09-15' });
  assert.equal(recentRecipes([...entries, recent])[0].data.slug, 'recent');
  const olderPublication = entry({ slug: 'older', title: 'Older', date_published: '2026-09-01', date_modified: '2026-09-20' });
  assert.equal(recentRecipes([olderPublication, recent])[0].data.slug, 'recent');
});

test('known total time filter excludes null and over threshold, includes zero and exact threshold', () => {
  for (const [total_minutes, expected] of [[null, false], [31, false], [30, true], [0, true]] as const) {
    assert.equal(matchesFilters({ ...metadata, total_minutes }, { maxMinutes: 30 }), expected);
  }
  assert.equal(matchesFilters(metadata, { category: 'Soup', cuisine: 'Test cuisine', ingredient: 'Carrot' }), true);
  assert.equal(matchesFilters(metadata, { category: 'Side Dish' }), false);
});

test('unknown links and unsafe URLs fail; known drafts are valid references', () => {
  const draft = entry({ slug: 'draft-soup', title: 'Draft soup', publication_status: 'draft' });
  validateRecipes([entry({}, `${body}\n[Future soup](../draft-soup/)`), draft]);
  for (const link of ['../typo/', 'javascript:alert%281%29', 'data:text/html,bad',
    '//example.com', 'https://example.com\\bad', '../draft-soup/../../escape/',
    '../draft-soup/?secret=1', '/draft-soup/', '../draft-soup.md', '#missing']) {
    assert.throws(() => validateRecipes([entry({}, `${body}\n[Bad](${link})`), draft]), /link|URL|fragment/i, link);
  }
  assert.throws(() => validateRecipes([entry({}, `${body}\n[Bad][target]\n\n[target]: ../typo/`)]), /link/i);
  assert.throws(() => validateRecipes([entry({}, `${body}\n<script>alert(1)</script>`)]), /HTML/i);
  assert.throws(() => validateRecipes([entry({}, `${body}\n[[Private note]]`)]), /wikilink/i);
});

test('rendering unwraps draft links and rewrites published links with base', async () => {
  const draft = entry({ slug: 'draft-soup', title: 'Draft soup', publication_status: 'draft' });
  const side = entry({ slug: 'test-side', title: 'Test side' });
  const recipe = entry({}, `${body}\n[Later](../draft-soup/)\n[Side][side]\n\n[side]: ../test-side/#ingredients`);
  const recipes = validateRecipes([recipe, draft, side]);
  const { html } = await renderRecipe(recipes[0], recipes, '/recipes/');
  assert.ok(html.includes('Later'));
  assert.ok(!html.includes('draft-soup'));
  assert.ok(html.includes('href="/recipes/test-side/#ingredients"'));
  assert.ok(!html.includes('application/ld+json'));
});

test('checkboxes are labeled and ingredient-only; jump headings are stable', async () => {
  const recipe = entry();
  const { html } = await renderRecipe(recipe, [recipe], '/recipes/');
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 2);
  assert.equal((html.match(/<label/g) ?? []).length, 2);
  assert.ok(html.includes('data-pagefind-index-attrs="data-ingredient-text"'));
  assert.ok(html.includes('data-ingredient-text="1 carrot"'));
  assert.ok(html.includes('id="ingredients"'));
  assert.ok(html.includes('id="directions"'));
  assert.ok(!html.split('id="directions"')[1].includes('type="checkbox"'));
});

test('numbered step headings and nutrition tables preserve existing body structure', async () => {
  const recipe = entry({}, `## Ingredients\n\n- Water\n\n## Instructions\n\n### Step 1: Combine\n\nCombine.\n\n### Step 2: Cook\n\nCook.\n\n## Shopping List\n\n- [ ] Water\n\n## Nutrition Estimate\n\n| Nutrient | Estimate |\n| --- | --- |\n| Calories | 10 kcal |\n`);
  validateRecipes([recipe]);
  const { html } = await renderRecipe(recipe, [recipe], '/recipes/');
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 1);
  assert.ok(html.includes('<table>'));
  assert.ok(html.includes('Step 2: Cook'));
});

test('headings cannot shadow page controls or ingredient labels', async () => {
  const recipe = entry({}, `${body}\n## Main\n\nText.\n\n## Ingredient 1\n\nText.`);
  const { html } = await renderRecipe(recipe, [recipe], '/recipes/');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.includes('main'));
  assert.throws(() => validateRecipes([entry({}, body.replace('## Ingredients', '### Ingredients'))]), /level-two/);
  assert.throws(() => validateRecipes([entry({}, `# Extra title\n\n${body}`)]), /level-two/);
});

test('fragment validation uses actual heading IDs including punctuation and Unicode', () => {
  validateRecipes([entry({}, `${body}\n## Salt & Pepper\n\nSeason.\n\n## Café\n\nNotes.\n\n[Seasoning](#salt--pepper)\n[Notes](#caf%C3%A9)`)]);
  assert.throws(() => validateRecipes([entry({}, `${body}\n[Bad](#bad%ZZ)`)]), /malformed heading fragment/);
});
