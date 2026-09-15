import assert from 'node:assert/strict';
import { writeFile, unlink, readFile, mkdir, mkdtemp, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { stringify } from 'yaml';
import { build, astroBin, generatedFiles, decodedOutput } from './build-helpers.ts';
import { readRecipes } from '../src/lib/read-recipes.ts';
import { readSources, validateSources } from '../src/lib/sources.ts';
import { copyRecipeTemplate } from './fixtures.ts';
import { HIDDEN_RECIPE, TEST_ORIGIN, publishedFixtures, sourceFixtures, draftSentinels } from './build-fixtures.ts';

const originals = await readRecipes();
const sources = await readSources();
const directory = await mkdtemp(join(process.cwd(), '.test-build-'));
const recipeDirectory = join(directory, 'recipes');
await mkdir(recipeDirectory);
const created: string[] = [];
try {
  const draft = await copyRecipeTemplate({
    slug: HIDDEN_RECIPE, title: 'DRAFTRECIPETITLESENTINEL',
    description: 'DRAFTRECIPEDESCRIPTIONSENTINEL', publication_status: 'draft',
    main_ingredients: ['DRAFTRECIPEINGREDIENTSENTINEL'],
  });
  const files = [
    ...await Promise.all(originals.map(async recipe => ({
      filename: recipe.filename,
      markdown: await readFile(join(process.cwd(), 'content', 'recipes', recipe.filename), 'utf8'),
    }))),
    ...publishedFixtures.map(recipe => ({
      filename: recipe.filename, markdown: `---\n${stringify(recipe.data)}---\n${recipe.body}`,
    })),
    { filename: `${HIDDEN_RECIPE}.md`, markdown: `${draft}\nDRAFTRECIPEBODYSENTINEL` },
  ];
  for (const recipe of files) {
    const path = join(recipeDirectory, recipe.filename);
    await writeFile(path, recipe.markdown, { flag: 'wx' });
    created.push(path);
  }
  const sourcePath = join(directory, 'sources.json');
  await writeFile(sourcePath, JSON.stringify(validateSources([...sources, ...sourceFixtures])), { flag: 'wx' });
  created.push(sourcePath);
  await readRecipes(recipeDirectory);
  build(directory);
  for (const file of await generatedFiles(join(process.cwd(), 'dist'))) {
    const output = await decodedOutput(file);
    for (const sentinel of draftSentinels) {
      assert.ok(!output.includes(sentinel), `Draft leaked in ${file}: ${sentinel}`);
    }
  }
} finally {
  for (const path of created) await unlink(path);
  await rmdir(recipeDirectory);
  await rmdir(directory);
}

const child = spawn(process.execPath, [
  astroBin, 'preview', '--host', '127.0.0.1', '--port', new URL(TEST_ORIGIN).port,
], { stdio: 'inherit', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' } });
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => child.kill(signal));
}
