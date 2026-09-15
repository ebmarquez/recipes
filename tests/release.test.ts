import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { sourceSchema, validateSources, publishedSources } from '../src/lib/sources.ts';
import { canonicalUrl, publicPages, renderSitemap, robotsText, SITE_BASE, SITE_ORIGIN } from '../src/lib/site.ts';
import { validateRecipes } from '../src/lib/recipe-contract.ts';
import { entry } from './fixtures.ts';
import { verifyOutput } from '../src/lib/verify-output.ts';

const source = {
  slug: 'reference-card',
  title: 'A creator’s recipe',
  description: 'Read the original method at its source.',
  source_name: 'Example creator',
  source_url: 'https://example.com/recipe',
  cuisine: 'Italian',
  category: 'Main Dish',
  publication_status: 'published',
};

test('source contract is strict, link-only and uses the shared URL safety rules', () => {
  assert.ok(sourceSchema.safeParse(source).success);
  for (const invalid of [
    { source_url: 'javascript:alert(1)' }, { source_url: '//example.com' },
    { source_url: 'https://user:password@example.com' }, { source_url: 'https://example.com/%0a' },
    { title: '<b>Copied</b>' }, { title: '' }, { slug: 'Unsafe slug' },
    { publication_status: 'private' }, { description: null }, { source_name: undefined },
    { instructions: ['Copied method'] }, { nutrition: { calories: 400 } },
  ]) {
    assert.equal(sourceSchema.safeParse({ ...source, ...invalid }).success, false, JSON.stringify(invalid));
  }
});

test('source slugs are unique and drafts never enter the public selection', () => {
  assert.throws(() => validateSources([source, source]), /duplicate.*slug/);
  assert.throws(() => validateSources({ sources: [source] }), /sources.json/);
  const items = validateSources([source, { ...source, slug: 'hidden-reference', publication_status: 'draft' }]);
  assert.deepEqual(publishedSources(items).map(item => item.slug), ['reference-card']);
});

test('public URLs, sitemap and robots respect the project base and exclude draft/404 routes', () => {
  const recipes = [entry(), entry({ slug: 'hidden-recipe', title: 'Hidden', publication_status: 'draft' })];
  const pages = publicPages(recipes);
  assert.equal(canonicalUrl('/recipes/'), `${SITE_ORIGIN}/recipes/`);
  assert.equal(canonicalUrl('/recipes/sources/'), `${SITE_ORIGIN}/recipes/sources/`);
  assert.throws(() => canonicalUrl('//example.com/recipes/'), /site/);
  assert.throws(() => canonicalUrl('/outside/'), /base/);
  assert.throws(() => canonicalUrl('/recipes/?q=carrot'), /query/);
  assert.deepEqual(pages.map(page => page.url), [
    `${SITE_ORIGIN}${SITE_BASE}`, `${SITE_ORIGIN}${SITE_BASE}sources/`,
    `${SITE_ORIGIN}${SITE_BASE}${recipes[0].data.slug}/`,
  ]);
  const xml = renderSitemap(pages);
  assert.ok(!xml.includes('hidden-recipe'));
  assert.ok(!xml.includes('404'));
  assert.ok(xml.includes('<lastmod>2026-09-14</lastmod>'));
  assert.ok(robotsText().includes(`Sitemap: ${SITE_ORIGIN}${SITE_BASE}sitemap.xml`));
  for (const slug of ['sources', 'robots', 'sitemap']) {
    assert.throws(() => validateRecipes([entry({ slug })]), /slug/);
  }
});

test('sitemap XML escapes attribute-sensitive characters rather than emitting unsafe XML', () => {
  const xml = renderSitemap([{ url: `https://example.com/recipes/?a=1&b=<tag>"'` }]);
  assert.ok(xml.includes('&amp;'));
  assert.ok(xml.includes('&lt;tag&gt;&quot;&apos;'));
  assert.ok(!xml.includes('<tag>'));
});

test('deployment output gate rejects fixture artifacts and test-content overrides', async () => {
  const root = join(process.cwd(), 'test-results');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'release-gate-'));
  const path = join(directory, 'test-build-leak.js');
  const previous = process.env.COOKBOOK_TEST_CONTENT_DIR;
  try {
    await writeFile(path, 'Fixture output must not deploy');
    await assert.rejects(verifyOutput(directory), /test fixture remains/);
    process.env.COOKBOOK_TEST_CONTENT_DIR = directory;
    await assert.rejects(verifyOutput(directory), /Refusing to verify a test-fixture deployment/);
  } finally {
    if (previous === undefined) delete process.env.COOKBOOK_TEST_CONTENT_DIR;
    else process.env.COOKBOOK_TEST_CONTENT_DIR = previous;
    await unlink(path);
    await rmdir(directory);
  }
});
