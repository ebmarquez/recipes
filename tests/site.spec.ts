import { test, expect } from '@playwright/test';
import { readRecipes } from '../src/lib/read-recipes.ts';
import { readSources, publishedSources } from '../src/lib/sources.ts';
import { publishedRecipes } from '../src/lib/publication.ts';
import { canonicalUrl, publicPages, SITE_BASE } from '../src/lib/site.ts';
import { readBlog, publishedPosts } from '../src/lib/blog.ts';
import { publishedFixtures, sourceFixtures, blogFixtures, HIDDEN_BLOG, BLOG_QUERY, HIDDEN_RECIPE, INGREDIENT_QUERY, EXTERNAL_QUERY, TEST_URL, BLOG_PHOTO, RECIPE_PHOTO, HIDDEN_PHOTO, UNUSED_PHOTO } from './build-fixtures.ts';

const originals = publishedRecipes(await readRecipes());
const recipes = [...originals, ...publishedFixtures];
const sources = publishedSources([...await readSources(), ...sourceFixtures]);
const posts = publishedPosts([...await readBlog(), ...blogFixtures]);
const cards = '[data-recipe-card]:visible';
const recipePaths = recipes.map(({ data }) => `${data.slug}/`);
const allPaths = ['./', 'sources/', 'blog/', 'search/', ...recipePaths, ...posts.map(post => `blog/${post.data.slug}/`)];
const knownQuick = recipes.filter(({ data }) => data.total_minutes !== null && data.total_minutes <= 30);

test('published photos load with alt text, captions and credit while draft and unused images return 404', async ({ page, request, browser }) => {
  for (const [path, filename, alt] of [
    ['blog/test-build-kitchen-note/', BLOG_PHOTO, 'Synthetic blog photo'],
    ['test-build-variable-soup/', RECIPE_PHOTO, 'Synthetic recipe photo'],
  ]) {
    await page.goto(path);
    const image = page.getByRole('img', { name: alt });
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute('src', `/recipes/photos/${filename}`);
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('.photo-credit')).toHaveText('Synthetic image for testing.');
    const response = await request.get(`photos/${filename}`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/webp');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  for (const name of [HIDDEN_PHOTO, UNUSED_PHOTO]) {
    expect((await request.get(`photos/${name}`)).status()).toBe(404);
  }
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const reading = await context.newPage();
    await reading.goto(`${TEST_URL}blog/test-build-kitchen-note/`);
    const image = reading.getByRole('img', { name: 'Synthetic blog photo' });
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(reading.locator('.photo-caption')).toHaveText('Photo caption fixture.');
  } finally {
    await context.close();
  }
});

test('blog navigation, chronology, recipe references and homepage previews use only published posts', async ({ page, request }) => {
  await page.goto('./');
  await expect(page.getByRole('link', { name: 'Local drafts', exact: true })).toHaveCount(0);
  for (const path of ['local-drafts/', `local-drafts/blog/${HIDDEN_BLOG}/`, `local-drafts/photos/${HIDDEN_PHOTO}`]) {
    expect((await request.get(path)).status()).toBe(404);
  }
  await expect(page.locator('[data-blog-card]')).toHaveCount(Math.min(posts.length, 3));
  await page.getByRole('navigation').getByRole('link', { name: 'Blog', exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/blog\/$/);
  const links = page.locator('[data-blog-card] h2 a');
  await expect(links).toHaveCount(posts.length);
  expect(await links.allTextContents()).toEqual(posts.map(post => post.data.title));
  await page.getByRole('link', { name: 'Synthetic kitchen note', exact: true }).click();
  await expect(page.locator('[data-blog-page]')).toBeVisible();
  await expect(page.locator('time')).toHaveAttribute('datetime', '2026-09-17');
  await expect(page.getByRole('region', { name: 'Featured recipe' })).toContainText('Synthetic thirty-minute main');
  await expect(page.getByRole('link', { name: 'Recipe directions' })).toHaveAttribute('href', '/recipes/test-build-thirty-minute-main/#directions');
  await expect(page.getByRole('link', { name: 'Earlier note' })).toHaveAttribute('href', '/recipes/blog/test-build-earlier-note/');
  await expect(page.locator('.recipe-body')).toContainText('Future post');
  await expect(page.locator('.recipe-body')).toContainText('Future dish');
  await expect(page.getByRole('link', { name: 'Future post' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Future dish' })).toHaveCount(0);
  expect(await page.content()).not.toContain(HIDDEN_BLOG);
  expect(await page.content()).not.toContain(HIDDEN_RECIPE);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  expect((await request.get(`blog/${HIDDEN_BLOG}/`)).status()).toBe(404);
  await page.getByRole('link', { name: 'Earlier note' }).click();
  await expect(page.getByRole('region', { name: 'Featured recipe' })).toHaveCount(0);
});

test('site-wide Pagefind search finds blog body and recipe ingredients without changing recipe filters', async ({ page }) => {
  await page.goto(`search/?q=${BLOG_QUERY}`);
  await expect(page.getByRole('status')).toHaveText('1 result');
  await expect(page.locator('[data-search-card]:visible')).toContainText('Synthetic kitchen note');
  await page.reload();
  await expect(page.getByLabel('Search recipes and blog posts', { exact: true })).toHaveValue(BLOG_QUERY);
  await expect(page.getByRole('status')).toHaveText('1 result');
  await page.getByLabel('Search recipes and blog posts', { exact: true }).fill(INGREDIENT_QUERY);
  await expect(page.getByRole('status')).toHaveText('2 results');
  for (const query of ['DRAFTBLOGBODYSENTINEL', 'DRAFTBLOGTITLESENTINEL', EXTERNAL_QUERY]) {
    await page.getByLabel('Search recipes and blog posts', { exact: true }).fill(query);
    await expect(page.getByRole('status')).toHaveText('0 results');
  }
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.locator('[data-search-card]:visible')).toHaveCount(recipes.length + posts.length);
  await page.goto(`./?q=${BLOG_QUERY}`);
  await expect(page.getByRole('status')).toHaveText('0 recipes');
});

test('site search failures show an explicit fallback and blog reading works without JavaScript', async ({ page, browser }) => {
  await page.route('**/pagefind/**', route => route.abort());
  await page.goto('search/');
  await page.getByLabel('Search recipes and blog posts', { exact: true }).fill(BLOG_QUERY);
  await expect(page.getByRole('alert')).toContainText('Search is unavailable');
  await expect(page.getByRole('status')).toContainText('search unavailable');
  await expect(page.locator('[data-search-card]:visible')).toHaveCount(recipes.length + posts.length);
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const reading = await context.newPage();
    await reading.goto(`${TEST_URL}blog/`);
    await reading.getByRole('link', { name: 'Synthetic kitchen note', exact: true }).click();
    await expect(reading.getByRole('heading', { name: 'Synthetic kitchen note', exact: true })).toBeVisible();
    await reading.getByRole('link', { name: 'Recipe directions' }).click();
    await expect(reading.locator('#directions')).toBeVisible();
    await reading.goto(`${TEST_URL}search/`);
    await expect(reading.locator('#site-search-fallback')).toBeVisible();
    await expect(reading.getByRole('search')).toBeHidden();
    await expect(reading.locator('[data-search-card]:visible')).toHaveCount(recipes.length + posts.length);
  } finally {
    await context.close();
  }
});

test('real Pagefind ingredient search excludes source-library references', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto('./');
  await expect(page).toHaveTitle('The Everyday Table');
  await expect(page.locator(cards)).toHaveCount(recipes.length);
  const indexed = page.waitForResponse(response => response.url().includes('/recipes/pagefind/') && response.ok());
  await page.getByLabel('Search recipes & ingredients').fill(INGREDIENT_QUERY);
  await indexed;
  await expect(page.locator(cards)).toHaveCount(1);
  await expect(page.locator(cards)).toHaveAttribute('data-url', '/recipes/test-build-thirty-minute-main/');
  await page.getByLabel('Search recipes & ingredients').fill(EXTERNAL_QUERY);
  await expect(page.getByRole('status')).toHaveText('0 recipes');
  expect(await page.evaluate(async query => {
    const moduleUrl = `${location.origin}/recipes/pagefind/pagefind.js`;
    const index = await import(moduleUrl);
    return (await index.search(query)).results.length;
  }, EXTERNAL_QUERY)).toBe(0);
  expect(failures).toEqual([]);
});

test('known-time filters exclude null/over-threshold values and combine with other filters', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Known total time').selectOption('30');
  await expect(page.locator(cards)).toHaveCount(knownQuick.length);
  for (const slug of ['test-build-variable-soup', 'test-build-long-main']) {
    await expect(page.locator(`[data-url="/recipes/${slug}/"]`)).toBeHidden();
  }
  for (const slug of ['test-build-zero-cook-side', 'test-build-thirty-minute-main']) {
    await expect(page.locator(`[data-url="/recipes/${slug}/"]`)).toBeVisible();
  }
  await page.getByLabel('Cuisine', { exact: true }).selectOption('Fixture Japanese');
  await page.getByLabel('Category', { exact: true }).selectOption('Fixture Main');
  await page.getByLabel('Main ingredient').selectOption('Carrot');
  await expect(page.locator(cards)).toHaveCount(1);
  await expect(page.locator(cards)).toHaveAttribute('data-url', '/recipes/test-build-thirty-minute-main/');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator(cards)).toHaveCount(recipes.length);
  await page.getByLabel('Category', { exact: true }).selectOption('Fixture Soup');
  await expect(page.locator(cards)).toHaveCount(1);
  await page.getByLabel('Known total time').selectOption('30');
  await expect(page.locator(cards)).toHaveCount(0);
  await expect(page.getByText('No recipes match.', { exact: false })).toBeVisible();
});

test('category and cuisine options reflect the entire published collection', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('./');
  for (const [name, key] of [['Cuisine', 'cuisine'], ['Category', 'category']] as const) {
    const expected = [...new Set(recipes.map(recipe => recipe.data[key]))].sort((a, b) => a.localeCompare(b));
    expect(expected.length).toBeGreaterThan(1);
    expect(await page.getByLabel(name, { exact: true }).locator('option').evaluateAll(options =>
      options.map(option => (option as HTMLOptionElement).value).filter(Boolean))).toEqual(expected);
    for (const value of expected) {
      await page.getByLabel(name, { exact: true }).selectOption(value);
      await expect(page.locator(cards)).toHaveCount(recipes.filter(recipe => recipe.data[key] === value).length);
    }
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.locator(cards)).toHaveCount(recipes.length);
  }
});

test('search/filter state survives reload and unavailable search is explicit', async ({ page }) => {
  await page.goto(`./?q=${INGREDIENT_QUERY}&time=30`);
  await expect(page.getByRole('status')).toHaveText('1 recipe');
  await expect(page.getByRole('alert')).toBeHidden();
  await page.getByLabel('Category', { exact: true }).selectOption('Fixture Main');
  await expect(page).toHaveURL(/category=Fixture\+Main/);
  await page.reload();
  await expect(page.getByLabel('Search recipes & ingredients')).toHaveValue(INGREDIENT_QUERY);
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue('Fixture Main');
  await expect(page.locator(cards)).toHaveCount(1);
  await page.route('**/pagefind/**', route => route.abort());
  await page.goto('./');
  await page.getByLabel('Search recipes & ingredients').fill(INGREDIENT_QUERY);
  await expect(page.getByRole('alert')).toContainText('Search is unavailable');
  await expect(page.getByRole('status')).toContainText('search unavailable');
  await page.getByLabel('Category', { exact: true }).selectOption('Fixture Soup');
  await expect(page.locator(cards)).toHaveCount(1);
});

test('draft recipes and source references never expose routes, links or searchable data', async ({ page, request }) => {
  expect((await request.get(`${HIDDEN_RECIPE}/`)).status()).toBe(404);
  expect((await request.get('test-build-hidden-source/')).status()).toBe(404);
  await page.goto('test-build-variable-soup/');
  await expect(page.getByText('Future recipe', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Future recipe' })).toHaveCount(0);
  expect(await page.content()).not.toContain(HIDDEN_RECIPE);
  await page.goto('./');
  for (const query of ['DRAFTRECIPEBODYSENTINEL', 'DRAFTSOURCETITLESENTINEL']) {
    await page.getByLabel('Search recipes & ingredients').fill(query);
    await expect(page.getByRole('status')).toHaveText('0 recipes');
  }
  await page.goto('sources/');
  expect(await page.content()).not.toContain('DRAFTSOURCE');
  expect(await page.content()).not.toContain('test-build-hidden-source');
});

test('source library credits originals and links to published adaptations without copying methods', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('navigation').getByRole('link', { name: 'Source library' }).click();
  await expect(page).toHaveURL(/\/recipes\/sources\/$/);
  await expect(page.getByRole('heading', { name: 'Source library', exact: true })).toBeVisible();
  await expect(page.getByText('These are external references', { exact: false })).toBeVisible();
  await expect(page.getByText('Publishers control availability and may require sign-in or a subscription.', { exact: false })).toBeVisible();
  const sourceCards = page.locator('[data-source-card]');
  await expect(sourceCards).toHaveCount(sources.length);
  for (const [index, source] of sources.entries()) {
    const card = sourceCards.nth(index);
    await expect(card.locator('h2 a')).toHaveAttribute('href', source.source_url);
    const adaptation = card.getByRole('link', { name: 'Read this adaptation', exact: true });
    if (recipes.some(recipe => recipe.data.slug === source.slug)) {
      await expect(adaptation).toHaveAttribute('href', `${SITE_BASE}${source.slug}/`);
    } else {
      await expect(adaptation).toHaveCount(0);
    }
    await expect(card).toContainText(`Source: ${source.source_name}`);
    await expect(card).toContainText(source.description);
    await expect(card).toContainText('External reference');
    await expect(card.locator('input, ol, table, .recipe-body, [data-recipe-page]')).toHaveCount(0);
  }
  await expect(page.locator('[data-pagefind-body], [data-recipe-card]')).toHaveCount(0);
});

test('recipe controls preserve numbered step headings, labeled ingredients, dates and print', async ({ page }) => {
  await page.goto('test-build-thirty-minute-main/');
  await page.getByRole('link', { name: 'Jump to ingredients' }).click();
  await expect(page).toHaveURL(/#ingredients$/);
  expect(await page.locator('#ingredients').evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(50);
  const checkboxes = page.getByRole('checkbox');
  await expect(checkboxes).toHaveCount(2);
  await page.getByLabel(`1 spoon ${INGREDIENT_QUERY}`, { exact: true }).check();
  for (const checkbox of await checkboxes.all()) {
    expect(await checkbox.evaluate(element => {
      const input = element as HTMLInputElement;
      return input.labels?.length === 1 && !!input.labels[0].textContent?.trim();
    })).toBe(true);
  }
  expect(await page.locator('.recipe-body').evaluate(element => {
    let section = '';
    for (const node of element.children) {
      if (node.tagName === 'H2') section = node.id;
      if (node.querySelector('input[type="checkbox"]') && section !== 'ingredients') return false;
    }
    return true;
  })).toBe(true);
  await page.getByRole('link', { name: 'Jump to directions' }).click();
  await expect(page).toHaveURL(/#directions$/);
  await expect(page.getByRole('heading', { name: 'Step 1: Combine' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Step 2: Finish' })).toBeVisible();
  await expect(page.getByText('4-6 servings', { exact: true })).toBeVisible();
  await expect(page.locator('time')).toHaveAttribute('datetime', '2026-09-14');
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  await page.evaluate(() => { window.print = () => { document.documentElement.dataset.printCalled = 'true'; }; });
  await page.getByRole('button', { name: 'Print recipe' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-print-called', 'true');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('.recipe-actions')).toBeHidden();
  await expect(page.locator('#ingredients')).toBeVisible();
  await expect(page.locator('#directions')).toBeVisible();
  expect(await page.locator('.ingredient label').first().evaluate(element => getComputedStyle(element).textDecorationLine)).toBe('none');
  const pdf = await page.pdf({ format: 'A4' });
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
});

test('every public page has the correct canonical, social metadata and working same-origin links', async ({ page, request }) => {
  test.setTimeout(90_000);
  const checked = new Set<string>();
  for (const path of allPaths) {
    expect((await page.goto(path))?.status()).toBe(200);
    const pathname = new URL(page.url()).pathname;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonicalUrl(pathname));
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonicalUrl(pathname));
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', await page.title());
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content',
      (await page.locator('meta[name="description"]').getAttribute('content'))!);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    const caveat = 'A personal collection of recipes I have made or want to make. Sources are credited and linked where known; not every recipe has been tested.';
    await expect(page.locator('.site-footer .collection-note')).toHaveText(caveat);
    await expect(page.locator('.site-footer .collection-note')).toBeVisible();
    if (path === './') await expect(page.locator('.hero .collection-note')).toHaveText(caveat);
    const recipe = recipes.find(item => pathname === `${SITE_BASE}${item.data.slug}/`);
    if (recipe) {
      const credit = page.locator('.recipe-header .source-credit');
      await expect(credit).toHaveText(`Source: ${recipe.data.source_name}`);
      if (recipe.data.source_url) await expect(credit.getByRole('link')).toHaveAttribute('href', recipe.data.source_url);
    }
    if (recipe?.data.date_published) await expect(page.locator('time')).toHaveAttribute('datetime', recipe.data.date_published);
    const links = await page.locator('a[href^="/"], link[href^="/"], script[src^="/"]').evaluateAll(elements =>
      [...new Set(elements.map(element => element.getAttribute('href') ?? element.getAttribute('src')!))]);
    for (const link of links) {
      expect(link.startsWith(SITE_BASE)).toBe(true);
      expect(link.includes('/recipes/recipes/')).toBe(false);
      if (checked.has(link)) continue;
      expect((await request.get(link)).status(), link).toBe(200);
      checked.add(link);
    }
  }
});

test('sitemap and robots include only real public pages, and 404 stays noindex', async ({ page, request }) => {
  const sitemap = await request.get('sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()['content-type']).toContain('xml');
  const xml = await sitemap.text();
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  expect(locations).toEqual(publicPages(recipes, posts).map(item => item.url));
  for (const forbidden of ['404', HIDDEN_RECIPE, 'test-build-hidden-source', 'test-build-public-source']) {
    expect(xml).not.toContain(forbidden);
  }
  const robots = await request.get('robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Sitemap: https://ebmarquez.github.io/recipes/sitemap.xml');
  expect(await robots.text()).toContain('Allow: /recipes/');
  expect((await page.goto('not-a-real-recipe/'))?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test('no-JavaScript reading, ingredient checking, source navigation and print remain usable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(TEST_URL);
    await expect(page.locator(cards)).toHaveCount(recipes.length);
    await expect(page.getByText('All recipes are listed below.', { exact: false })).toBeVisible();
    await expect(page.getByRole('search')).toBeHidden();
    await page.getByRole('link', { name: 'Synthetic no-cook side', exact: true }).click();
    await page.getByRole('link', { name: 'Jump to directions' }).click();
    await expect(page).toHaveURL(/#directions$/);
    await page.getByRole('checkbox').first().check();
    await expect(page.getByRole('checkbox').first()).toBeChecked();
    await expect(page.getByText('0 minutes', { exact: true })).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#directions')).toBeVisible();
    await expect(page.locator('.site-header')).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    await page.getByRole('navigation').getByRole('link', { name: 'Source library' }).click();
    await expect(page.locator('[data-source-card]')).toHaveCount(sources.length);
  } finally {
    await context.close();
  }
});

test('all pages fit 390px without sideways scroll and offer keyboard focus', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of allPaths) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBe(true);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    expect(await page.getByRole('link', { name: 'Skip to content' }).evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
    if (path === 'sources/') await page.screenshot({ path: testInfo.outputPath('sources-mobile.png'), fullPage: true });
  }
});
