import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { readRecipes } from './read-recipes.ts';
import { readSources, publishedSources } from './sources.ts';
import { publishedRecipes } from './publication.ts';
import { canonicalUrl, publicPages, renderSitemap, robotsText, SITE_BASE } from './site.ts';
import { generatedFiles, decodedOutput } from './output-files.ts';

export async function verifyOutput(directory = join(process.cwd(), 'dist')): Promise<void> {
  assert.ok(!process.env.COOKBOOK_TEST_CONTENT_DIR, 'Refusing to verify a test-fixture deployment');
  const allRecipes = await readRecipes();
  const recipes = publishedRecipes(allRecipes);
  const sources = publishedSources(await readSources());
  const expectedHtml = new Set(['index.html', '404.html', 'sources/index.html',
    ...recipes.map(({ data }) => `${data.slug}/index.html`)]);
  const actualHtml = new Set<string>();
  let indexedPages = 0;
  for (const file of await generatedFiles(directory)) {
    const name = relative(directory, file).split(sep).join('/');
    const content = await decodedOutput(file);
    if (name.endsWith('.pf_fragment')) indexedPages++;
    assert.ok(!name.includes('test-build-') && !content.includes('test-build-'), `${name}: test fixture remains`);
    assert.ok(!/DRAFT(?:RECIPE|SOURCE)\w*SENTINEL/.test(content), `${name}: draft sentinel remains`);
    assert.ok(!/(^|\/)(?:content|tests|src)\//.test(name), `${name}: source directory in deployment output`);
    if (!name.endsWith('.html') || name.startsWith('pagefind/')) continue;
    actualHtml.add(name);
    if (name === '404.html') {
      assert.ok(content.includes('content="noindex, follow"'), '404 must stay noindex');
      continue;
    }
    const path = `${SITE_BASE}${name.replace(/index\.html$/, '')}`;
    assert.ok(content.includes(`rel="canonical" href="${canonicalUrl(path)}"`), `${name}: incorrect canonical`);
    assert.ok(!content.includes('content="noindex'), `${name}: public page is noindex`);
  }
  assert.deepEqual(actualHtml, expectedHtml, 'Generated pages differ from the published collection');
  assert.equal(indexedPages, recipes.length, 'Pagefind must contain exactly the published recipes');
  for (const { data } of recipes) {
    assert.ok(data.date_published, `${data.slug}: owner-approved release date_published is required before deployment`);
    const html = await readFile(join(directory, data.slug, 'index.html'), 'utf8');
    assert.ok(html.includes(`datetime="${data.date_published}"`), `${data.slug}: publication date not rendered`);
  }
  const sourceHtml = await readFile(join(directory, 'sources', 'index.html'), 'utf8');
  assert.equal((sourceHtml.match(/\bdata-source-card\b/g) ?? []).length, sources.length);
  assert.ok(!sourceHtml.includes('data-pagefind-body'), 'External sources must not enter recipe search');
  assert.equal(await readFile(join(directory, 'sitemap.xml'), 'utf8'), renderSitemap(publicPages(allRecipes)));
  assert.equal(await readFile(join(directory, 'robots.txt'), 'utf8'), robotsText());
  console.log(`Verified clean release output: ${recipes.length} recipes, ${sources.length} external references, ${recipes.length + 2} sitemap pages.`);
}
