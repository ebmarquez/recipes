import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { readRecipes } from '../src/lib/read-recipes.ts';
import { publishedRecipes } from '../src/lib/publication.ts';
import { metadata, body, copyRecipeTemplate } from './fixtures.ts';

test('file reader reports missing frontmatter, duplicate YAML keys and missing fields', async () => {
  const root = join(process.cwd(), 'test-results');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'content-'));
  const path = join(directory, `${metadata.slug}.md`);
  try {
    const cases: [string, RegExp][] = [
      [body, /missing YAML frontmatter/],
      [`---\ntitle: One\ntitle: Two\n---\n${body}`, /unique|same key|Map keys/i],
      [`---\ntitle: Missing status\n---\n${body}`, /publication_status/],
      [`---\ntitle: Missing rest\npublication_status: draft\n---\n${body}`, /slug/],
    ];
    for (const [input, expected] of cases) {
      await writeFile(path, input);
      await assert.rejects(readRecipes(directory), expected);
    }
    await writeFile(path, `---\n${stringify(metadata)}---\n${body}`);
    const [recipe] = await readRecipes(directory);
    assert.equal(recipe.data.date_created, '2026-09-01');
    assert.equal(recipe.data.total_minutes, null);
    assert.equal(recipe.data.yield, '4-6 servings');
  } finally {
    await unlink(path);
    await rmdir(directory);
  }
});

test('copied authoring template accepts a new draft without presumed attribution and gates publication', async () => {
  const root = join(process.cwd(), 'test-results');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'template-'));
  const slug = 'test-new-template-draft';
  const path = join(directory, `${slug}.md`);
  try {
    await writeFile(path, await copyRecipeTemplate({ slug }));
    const recipes = await readRecipes(directory);
    assert.equal(recipes.length, 1);
    assert.equal(recipes[0].data.slug, slug);
    assert.equal(recipes[0].data.publication_status, 'draft');
    assert.equal(recipes[0].data.date_published, null);
    assert.equal(recipes[0].data.source_name, undefined);
    assert.equal(recipes[0].data.total_minutes, null);
    assert.equal(publishedRecipes(recipes).length, 0);
    await writeFile(path, await copyRecipeTemplate({ slug, publication_status: 'published' }));
    await assert.rejects(readRecipes(directory), /source_name/);
    await writeFile(path, await copyRecipeTemplate({
      slug,
      publication_status: 'published',
      source_name: 'Synthetic test fixture; not a real recipe',
    }));
    assert.equal(publishedRecipes(await readRecipes(directory)).length, 1);
  } finally {
    await unlink(path);
    await rmdir(directory);
  }
});
