import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, readFile, writeFile, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDocument, stringify } from 'yaml';
import { blogSchema, validateBlog, publishedPosts, blogHref, readBlog, type BlogPost } from '../src/lib/blog.ts';
import { renderBlog } from '../src/lib/recipe-markdown.ts';
import { publicPages } from '../src/lib/site.ts';
import { entry, copyBlogTemplate } from './fixtures.ts';

const recipe = entry();
const metadata: BlogPost = {
  title: 'A synthetic kitchen note', slug: 'kitchen-note', description: 'Test-only kitchen prose.',
  publication_status: 'published', date_created: '2026-09-17', date_modified: '2026-09-17',
  date_published: '2026-09-17', featured_recipe: recipe.data.slug,
};
const body = '## Kitchen notes\n\nSynthetic observations, not a claimed cooking experience.';
const post = (data: Partial<BlogPost> = {}, content = body) => ({
  filename: `${data.slug ?? metadata.slug}.md`, data: { ...metadata, ...data }, body: content,
});

test('blog schema requires real dates, explicit status, strict metadata and a draft/null date pair', () => {
  assert.ok(blogSchema.safeParse(metadata).success);
  assert.ok(blogSchema.safeParse({ ...metadata, publication_status: 'draft', date_published: null }).success);
  for (const invalid of [
    { title: '' }, { title: '<b>Unsafe</b>' }, { slug: 'Bad Slug' }, { slug: 'index' },
    { date_published: '2026-02-30' }, { date_published: null }, { date_published: undefined },
    { publication_status: 'draft' }, { publication_status: undefined }, { extra: 'unknown' },
    { date_created: 'yesterday' }, { featured_recipe: undefined }, { featured_recipe: '../recipe/' },
  ]) assert.equal(blogSchema.safeParse({ ...metadata, ...invalid }).success, false, JSON.stringify(invalid));
});

test('blog validation rejects wrong filenames, duplicate slugs/titles, empty bodies and missing or draft featured recipes', () => {
  const validate = (items = [post()], recipes = [recipe]) => validateBlog(items, recipes);
  assert.equal(validate().length, 1);
  assert.throws(() => validate([{ ...post(), filename: 'wrong.md' }]), /blog\/wrong.md.*filename/);
  assert.throws(() => validate([post(), post()]), /duplicate slug/);
  assert.throws(() => validate([post(), post({ slug: 'other', title: '  A SYNTHETIC kitchen note ' })]), /duplicate title/);
  assert.throws(() => validate([post({}, '  ')]), /blog\/kitchen-note.md.*body/);
  assert.throws(() => validate([post({ featured_recipe: 'missing' })]), /featured_recipe.*does not exist/);
  const draftRecipe = entry({ publication_status: 'draft' });
  assert.throws(() => validate([post()], [draftRecipe]), /featured_recipe must be published/);
  assert.equal(validate([post({ publication_status: 'draft', date_published: null })], [draftRecipe]).length, 1);
  assert.equal(validate([post({ featured_recipe: null })], []).length, 1);
});

test('blog Markdown validates safe links, references, fragments and public output without recipe controls', async () => {
  const draft = post({ slug: 'hidden-note', title: 'Hidden note', publication_status: 'draft', date_published: null });
  const hiddenRecipe = entry({ slug: 'hidden-recipe', title: 'Hidden recipe', publication_status: 'draft' });
  const markdown = `## Kitchen notes

[Recipe](../../${recipe.data.slug}/#directions)
[Here](#kitchen-notes)
[Draft post](../hidden-note/)
[Draft recipe](../../hidden-recipe/)
[Reference][recipe]

[recipe]: ../../${recipe.data.slug}/

- [ ] A writing prompt
`;
  const posts = validateBlog([post({}, markdown), draft], [recipe, hiddenRecipe]);
  const { html } = await renderBlog(posts[0], [recipe, hiddenRecipe], posts, '/cookbook/');
  assert.ok(html.includes(`href="/cookbook/${recipe.data.slug}/#directions"`));
  assert.ok(html.includes('href="#kitchen-notes"'));
  assert.ok(html.includes('Draft post') && html.includes('Draft recipe'));
  assert.ok(!html.includes('hidden-note') && !html.includes('hidden-recipe'));
  assert.ok(!html.includes('<input') && !html.includes('data-ingredient'));
  for (const content of [
    '# A second title', '<script>alert(1)</script>', '![Image](https://example.com/image.png)', '[[wikilink]]',
    '[Bad](javascript:alert)', '[Bad](//example.com/)', '[Bad](../../../outside/)',
    '[Bad](../missing/)', `[Bad](../../${recipe.data.slug}/#missing)`,
    '[Bad](#missing)', '[Bad](https://user:password@example.com/)',
    '[Bad](#%E0%A4)', '[Bad](../../missing/)',
  ]) assert.throws(() => validateBlog([post({}, content)], [recipe]), /blog\/kitchen-note.md/);
});

test('blog and recipe slugs can coincide without confusing link namespaces or heading fragments', async () => {
  const first = post({ slug: recipe.data.slug }, `## Notes\n\n[Recipe](../../${recipe.data.slug}/#directions)\n\n[Other post](../other/#notes)`);
  const other = post({ slug: 'other', title: 'Other note' }, '## Notes\n\nText.');
  const posts = validateBlog([first, other], [recipe]);
  const { html } = await renderBlog(posts[0], [recipe], posts, '/');
  assert.ok(html.includes(`href="/${recipe.data.slug}/#directions"`));
  assert.ok(html.includes('href="/blog/other/#notes"'));
});

test('draft rendering retains local heading anchors without revealing other draft URLs', async () => {
  const posts = validateBlog([
    post({ publication_status: 'draft', date_published: null }, '## Notes\n\n[Here](#notes)\n\n[Other draft](../other/)\n'),
    post({ slug: 'other', title: 'Other draft', publication_status: 'draft', date_published: null }),
  ], [recipe]);
  const { html } = await renderBlog(posts[0], [recipe], posts, '/recipes/');
  assert.ok(html.includes('href="#notes"'));
  assert.ok(html.includes('Other draft'));
  assert.ok(!html.includes('/other/'));
});

test('published posts sort by publication date then slug and sitemap excludes drafts', () => {
  const posts = validateBlog([
    post({ slug: 'older', title: 'Older', date_published: '2026-09-16' }),
    post({ slug: 'z-new', title: 'New Z' }),
    post({ slug: 'a-new', title: 'New A' }),
    post({ slug: 'hidden', title: 'Hidden', publication_status: 'draft', date_published: null }),
  ], [recipe]);
  assert.deepEqual(publishedPosts(posts).map(post => post.data.slug), ['a-new', 'z-new', 'older']);
  assert.equal(blogHref('a-new', '/recipes/'), '/recipes/blog/a-new/');
  const urls = publicPages([recipe], posts).map(page => page.url);
  assert.ok(urls.some(url => url.endsWith('/blog/a-new/')));
  assert.ok(!urls.some(url => url.includes('/hidden/')));
});

test('blog file reader and actual authoring template enforce draft defaults and YAML errors', async () => {
  const root = join(process.cwd(), 'test-results');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'blog-'));
  const blogDirectory = join(directory, 'blog');
  await mkdir(blogDirectory);
  const path = join(blogDirectory, 'kitchen-note.md');
  try {
    await writeFile(path, await copyBlogTemplate({ slug: 'kitchen-note' }));
    const posts = await readBlog(directory, []);
    assert.equal(posts[0].data.publication_status, 'draft');
    assert.equal(posts[0].data.date_published, null);
    assert.equal(publishedPosts(posts).length, 0);
    for (const [input, error] of [
      [body, /missing YAML frontmatter/],
      ['---\ntitle: One\ntitle: Two\n---\nText.', /unique|same key|Map keys/i],
      [`---\n${stringify({ ...metadata, date_published: null })}---\n${body}`, /date_published/],
    ] as const) {
      await writeFile(path, input);
      await assert.rejects(readBlog(directory, [recipe]), error);
    }
  } finally {
    await unlink(path);
    await rmdir(blogDirectory);
    await rmdir(directory);
  }
});

test('blog authoring agents have valid profiles without implicit publishing tools or model overrides', async () => {
  for (const name of ['sous-chef-chronicler', 'publishers-editor', 'meal-to-post-planner', 'riley-cookbook-story-editor']) {
    const path = join(process.cwd(), '.github', 'agents', `${name}.agent.md`);
    const raw = await readFile(path, 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(match, path);
    const document = parseDocument(match[1], { uniqueKeys: true });
    assert.deepEqual(document.errors, []);
    const data = document.toJS();
    assert.ok(data.name && data.description);
    assert.deepEqual(data.tools.filter((tool: string) => !['read', 'search', 'edit', 'execute'].includes(tool)), []);
    assert.equal(data.model, undefined);
  }
});
