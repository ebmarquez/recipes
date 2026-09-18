import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { readRecipes } from './read-recipes.ts';
import { readSources, publishedSources } from './sources.ts';
import { publishedRecipes } from './publication.ts';
import { canonicalUrl, publicPages, renderSitemap, robotsText, SITE_BASE } from './site.ts';
import { generatedFiles, decodedOutput } from './output-files.ts';
import { readBlog, publishedPosts } from './blog.ts';
import { publishedPhotoNames, readPhoto } from './photos.ts';

export async function verifyOutput(directory = join(process.cwd(), 'dist')): Promise<void> {
  assert.ok(!process.env.COOKBOOK_TEST_CONTENT_DIR, 'Refusing to verify a test-fixture deployment');
  const allRecipes = await readRecipes();
  const recipes = publishedRecipes(allRecipes);
  const sources = publishedSources(await readSources());
  const allPosts = await readBlog(undefined, allRecipes);
  const posts = publishedPosts(allPosts);
  const expectedPhotos = new Set(publishedPhotoNames([...allRecipes, ...allPosts]).map(filename => `photos/${filename}`));
  const actualPhotos = new Set<string>();
  const expectedHtml = new Set(['index.html', '404.html', 'sources/index.html', 'blog/index.html', 'search/index.html',
    ...recipes.map(({ data }) => `${data.slug}/index.html`),
    ...posts.map(({ data }) => `blog/${data.slug}/index.html`)]);
  const actualHtml = new Set<string>();
  let indexedPages = 0;
  for (const file of await generatedFiles(directory)) {
    const name = relative(directory, file).split(sep).join('/');
    if (/\.(?:webp|png|jpe?g|gif|avif|tiff?)$/i.test(name)) {
      assert.ok(expectedPhotos.has(name), `${name}: unapproved or draft photo in deployment output`);
      actualPhotos.add(name);
      const filename = name.slice('photos/'.length);
      const [source, output] = await Promise.all([readPhoto(filename), readPhoto(filename, directory)]);
      assert.deepEqual(output.bytes, source.bytes, `${name}: output differs from the validated, metadata-free photo`);
    }
    const content = await decodedOutput(file);
    assert.ok(!name.startsWith('local-drafts/') && !content.includes('/local-drafts/'), `${name}: local draft preview leaked into deployment output`);
    if (name.endsWith('.pf_fragment')) indexedPages++;
    assert.ok(!name.includes('test-build-') && !content.includes('test-build-'), `${name}: test fixture remains`);
    assert.ok(!/DRAFT(?:RECIPE|SOURCE|BLOG)\w*SENTINEL/.test(content), `${name}: draft sentinel remains`);
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
  assert.deepEqual(actualPhotos, expectedPhotos, 'Generated photos differ from published entry references');
  assert.equal(indexedPages, recipes.length + posts.length, 'Pagefind must contain exactly the published recipes and blog posts');
  for (const { data } of recipes) {
    assert.ok(data.date_published, `${data.slug}: owner-approved release date_published is required before deployment`);
    const html = await readFile(join(directory, data.slug, 'index.html'), 'utf8');
    assert.ok(html.includes(`datetime="${data.date_published}"`), `${data.slug}: publication date not rendered`);
  }
  for (const { data } of posts) {
    assert.ok(data.date_published, `blog/${data.slug}: owner-approved date_published is required`);
    const html = await readFile(join(directory, 'blog', data.slug, 'index.html'), 'utf8');
    assert.ok(html.includes(`datetime="${data.date_published}"`), `blog/${data.slug}: publication date not rendered`);
  }
  const blogHtml = await readFile(join(directory, 'blog', 'index.html'), 'utf8');
  assert.equal((blogHtml.match(/\bdata-blog-card\b/g) ?? []).length, posts.length, 'Blog index must list exactly the published posts');
  if (!posts.length) assert.ok(blogHtml.includes('waiting for its first approved post'), 'Empty blog must explain its empty state');
  const homeHtml = await readFile(join(directory, 'index.html'), 'utf8');
  assert.equal((homeHtml.match(/\bdata-recipe-card\b/g) ?? []).length, recipes.length, 'Blog cards must not affect recipe counts');
  assert.equal((homeHtml.match(/\bdata-blog-card\b/g) ?? []).length, Math.min(posts.length, 3), 'Homepage must show only the latest three posts');
  const searchHtml = await readFile(join(directory, 'search', 'index.html'), 'utf8');
  assert.equal((searchHtml.match(/\bdata-search-card\b/g) ?? []).length, recipes.length + posts.length, 'Site search must list published recipes and posts');
  assert.ok(!blogHtml.includes('data-pagefind-body') && !searchHtml.includes('data-pagefind-body'), 'Listing pages must not enter Pagefind');
  const sourceHtml = await readFile(join(directory, 'sources', 'index.html'), 'utf8');
  assert.equal((sourceHtml.match(/\bdata-source-card\b/g) ?? []).length, sources.length);
  assert.ok(!sourceHtml.includes('data-pagefind-body'), 'External sources must not enter recipe search');
  assert.equal(await readFile(join(directory, 'sitemap.xml'), 'utf8'), renderSitemap(publicPages(allRecipes, allPosts)));
  assert.equal(await readFile(join(directory, 'robots.txt'), 'utf8'), robotsText());
  console.log(`Verified clean release output: ${recipes.length} recipes, ${posts.length} blog posts, ${sources.length} external references, ${recipes.length + posts.length + 4} sitemap pages.`);
}
