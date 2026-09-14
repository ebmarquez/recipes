import { test, expect } from '@playwright/test';
import { access } from 'node:fs/promises';
import { join } from 'node:path';

const cards = '[data-recipe-card]:visible';

test('private pilot navigation and Pagefind ingredient search use real base-aware output', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto('./');
  await expect(page).toHaveTitle('The Everyday Table');
  await expect(page.getByRole('heading', { name: 'The Everyday Table', exact: true })).toBeVisible();
  await expect(page.locator(cards)).toHaveCount(4);
  const response = page.waitForResponse(response => response.url().includes('/recipes/pagefind/') && response.ok());
  await page.getByLabel('Search recipes & ingredients').fill('russet');
  await response;
  await expect(page.locator(cards)).toHaveCount(1);
  await expect(page.locator(cards)).toContainText('Budget Beef Picadillo');
  await page.locator(cards).getByRole('link').click();
  await expect(page).toHaveURL(/\/recipes\/budget-beef-picadillo\/$/);
  expect(failures).toEqual([]);
});

test('filters combine cuisine, category, main ingredient and known total time', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Known total time').selectOption('30');
  await expect(page.locator(cards)).toHaveCount(2);
  const visibleText = (await page.locator(cards).allTextContents()).join(' ');
  expect(visibleText).not.toContain('Synthetic variable-time soup');
  expect(visibleText).not.toContain('Budget Beef');
  await page.getByLabel('Cuisine', { exact: true }).selectOption('Mexican');
  await expect(page.locator(cards)).toHaveCount(1);
  await page.getByLabel('Category', { exact: true }).selectOption('Side Dish');
  await page.getByLabel('Main ingredient').selectOption('Zucchini');
  await expect(page.locator(cards)).toHaveCount(1);
  await expect(page.locator(cards)).toContainText('Calabacitas');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator(cards)).toHaveCount(4);
  await page.getByLabel('Category', { exact: true }).selectOption('Soup');
  await expect(page.locator(cards)).toHaveCount(1);
  await page.getByLabel('Known total time').selectOption('30');
  await expect(page.locator(cards)).toHaveCount(0);
  await expect(page.getByText('No recipes match.', { exact: false })).toBeVisible();
});

test('search and filter state survive a reload and intersect', async ({ page }) => {
  await page.goto('./?q=cilantro&time=30');
  await expect(page.locator(cards)).toHaveCount(2);
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('2 recipes');
  await page.getByLabel('Main ingredient').selectOption('Cabbage');
  await expect(page.locator(cards)).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel('Search recipes & ingredients')).toHaveValue('cilantro');
  await expect(page.getByLabel('Main ingredient')).toHaveValue('Cabbage');
  await expect(page.locator(cards)).toHaveCount(1);
});

test('search failure is explicit and browsing remains usable', async ({ page }) => {
  await page.route('**/pagefind/**', route => route.abort());
  await page.goto('./');
  await page.getByLabel('Search recipes & ingredients').fill('carrot');
  await expect(page.getByRole('alert')).toContainText('Search is unavailable');
  await expect(page.getByRole('status')).toContainText('search unavailable');
  await page.getByLabel('Category', { exact: true }).selectOption('Soup');
  await expect(page.locator(cards)).toHaveCount(1);
});

test('draft routes, search and related URLs never leak', async ({ page, request }) => {
  const response = await request.get('test-pilot-hidden-draft/');
  expect(response.status()).toBe(404);
  await expect(access(join(process.cwd(), 'dist', 'test-pilot-hidden-draft'))).rejects.toThrow();
  await page.goto('test-pilot-variable-soup/');
  await expect(page.getByText('Future recipe', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Future recipe' })).toHaveCount(0);
  expect(await page.content()).not.toContain('test-pilot-hidden-draft');
  await page.goto('./');
  await page.getByLabel('Search recipes & ingredients').fill('DRAFTONLYBODYSENTINEL');
  await expect(page.getByRole('status')).toHaveText('0 recipes');
});

test('recipe jumps, labeled ingredient controls, source and print layout', async ({ page }) => {
  await page.goto('budget-beef-picadillo/');
  await page.getByRole('link', { name: 'Jump to ingredients' }).click();
  await expect(page).toHaveURL(/#ingredients$/);
  expect(await page.locator('#ingredients').evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(50);
  const checkboxes = page.getByRole('checkbox');
  expect(await checkboxes.count()).toBeGreaterThan(10);
  await page.getByLabel('1 pound ground beef, preferably 85% lean', { exact: true }).check();
  await expect(page.getByLabel('1 pound ground beef, preferably 85% lean', { exact: true })).toBeChecked();
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
  await expect(page.getByText('4-5 servings', { exact: true })).toBeVisible();
  await expect(page.getByText('Source: Original recipe developed with AI assistance')).toBeVisible();
  await expect(page.locator('table')).toContainText('Estimate');
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  await page.evaluate(() => {
    window.print = () => { document.documentElement.dataset.printCalled = 'true'; };
  });
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
  expect(pdf.length).toBeGreaterThan(1000);
});

test('all approved direct pages and same-origin links resolve with private metadata', async ({ page, request }) => {
  for (const slug of ['budget-beef-picadillo', 'calabacitas', 'cabbage-lime-slaw']) {
    await page.goto(`${slug}/`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    const links = await page.locator('a[href^="/"], link[href^="/"], script[src^="/"]').evaluateAll(elements =>
      [...new Set(elements.map(element => element.getAttribute('href') ?? element.getAttribute('src')!))]);
    for (const link of links) {
      expect(link.startsWith('/recipes/')).toBe(true);
      expect((await request.get(link)).status(), link).toBe(200);
    }
  }
});

test('no-JavaScript reading, ingredient checking, related links and print remain available', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4322/recipes/');
    await expect(page.locator(cards)).toHaveCount(4);
    await expect(page.getByText('All recipes are listed below.', { exact: false })).toBeVisible();
    await expect(page.getByRole('search')).toBeHidden();
    await page.getByRole('link', { name: 'Calabacitas - Zucchini and Corn', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ingredients', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Jump to directions' }).click();
    await expect(page).toHaveURL(/#directions$/);
    await page.getByRole('checkbox').first().check();
    await expect(page.getByRole('checkbox').first()).toBeChecked();
    await page.getByRole('link', { name: 'Cabbage and Lime Slaw', exact: true }).click();
    await expect(page).toHaveURL(/\/recipes\/cabbage-lime-slaw\/$/);
    await expect(page.getByText('0 minutes', { exact: true })).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#directions')).toBeVisible();
    await expect(page.locator('.site-header')).toBeHidden();
  } finally {
    await context.close();
  }
});

test('390px layout has no sideways scroll and supports keyboard focus', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['./', 'budget-beef-picadillo/', 'calabacitas/', 'cabbage-lime-slaw/', 'test-pilot-variable-soup/']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    expect(await page.getByRole('link', { name: 'Skip to content' }).evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
    if (path === './') await page.screenshot({ path: testInfo.outputPath('home-mobile.png'), fullPage: true });
  }
  await page.goto('budget-beef-picadillo/');
  await expect(page.getByRole('link', { name: 'Vegetarian Mexican Rice' })).toHaveCount(0);
  const links = await page.locator('a[href^="/"]').evaluateAll(elements => elements.map(element => element.getAttribute('href')!));
  expect(links.every(link => link.startsWith('/recipes/') && !link.includes('/recipes/recipes/'))).toBe(true);
});
