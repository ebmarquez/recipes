import assert from 'node:assert/strict';
import { writeFile, unlink, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { stringify } from 'yaml';
import { build, astroBin, generatedFiles, decodedOutput } from './build-helpers.ts';
import { readRecipes } from '../src/lib/read-recipes.ts';
import { publishedRecipes } from '../src/lib/publication.ts';
import { entry, body, copyRecipeTemplate } from './fixtures.ts';

const directory = join(process.cwd(), 'content', 'recipes');
const originals = await readRecipes(directory);
assert.equal(publishedRecipes(originals).length, 3, 'Current approved pilot should contain three recipes; update this test when the pilot grows.');
const originalBytes = new Map(await Promise.all(originals.map(async recipe =>
  [recipe.filename, await readFile(join(directory, recipe.filename), 'utf8')] as const)));
const draftMarkdown = await copyRecipeTemplate({
  slug: 'test-pilot-hidden-draft',
  title: 'Unreleased aubergine sentinel',
  description: 'DRAFTONLYSECRETSENTINEL',
  publication_status: 'draft',
  main_ingredients: ['DRAFTONLYINGREDIENT'],
});
const soup = entry({
  slug: 'test-pilot-variable-soup',
  title: 'Synthetic variable-time soup',
}, `${body}\n[Future recipe](../test-pilot-hidden-draft/)\n`);
const created: string[] = [];
try {
  for (const recipe of [
    { filename: 'test-pilot-hidden-draft.md', markdown: `${draftMarkdown}\nDRAFTONLYBODYSENTINEL` },
    { filename: soup.filename, markdown: `---\n${stringify(soup.data)}---\n${soup.body}` },
  ]) {
    const path = join(directory, recipe.filename);
    await writeFile(path, recipe.markdown, { flag: 'wx' });
    created.push(path);
  }
  await readRecipes(directory);
  build();
  for (const file of await generatedFiles(join(process.cwd(), 'dist'))) {
    const output = await decodedOutput(file);
    for (const sentinel of ['test-pilot-hidden-draft', 'Unreleased aubergine sentinel', 'DRAFTONLYSECRETSENTINEL', 'DRAFTONLYINGREDIENT', 'DRAFTONLYBODYSENTINEL']) {
      assert.ok(!output.includes(sentinel), `Draft leaked in ${file}: ${sentinel}`);
    }
  }
} finally {
  for (const path of created) await unlink(path);
}
for (const [filename, bytes] of originalBytes) {
  assert.equal(await readFile(join(directory, filename), 'utf8'), bytes, `Existing recipe changed: ${filename}`);
}
const child = spawn(process.execPath, [astroBin, 'preview', '--host', '127.0.0.1', '--port', '4322'], {
  stdio: 'inherit',
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
});
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => child.kill(signal));
}
