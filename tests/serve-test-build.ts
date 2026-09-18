import assert from 'node:assert/strict';
import { writeFile, unlink, readFile, mkdir, mkdtemp, rmdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { stringify } from 'yaml';
import { build, astroBin, generatedFiles, decodedOutput } from './build-helpers.ts';
import { readRecipes } from '../src/lib/read-recipes.ts';
import { readSources, validateSources } from '../src/lib/sources.ts';
import { copyRecipeTemplate, copyBlogTemplate } from './fixtures.ts';
import { readBlog } from '../src/lib/blog.ts';
import { HIDDEN_RECIPE, HIDDEN_BLOG, TEST_ORIGIN, publishedFixtures, sourceFixtures, draftSentinels, blogFixtures, BLOG_PHOTO, RECIPE_PHOTO, HIDDEN_PHOTO, UNUSED_PHOTO } from './build-fixtures.ts';
import { publishedPhotoNames } from '../src/lib/photos.ts';

const originals = await readRecipes();
const sources = await readSources();
const posts = await readBlog(undefined, originals);
const directory = await mkdtemp(join(process.cwd(), '.test-build-'));
const recipeDirectory = join(directory, 'recipes');
const blogDirectory = join(directory, 'blog');
const photoDirectory = join(directory, 'photos');
await mkdir(recipeDirectory);
await mkdir(blogDirectory);
await mkdir(photoDirectory);
const created: string[] = [];
try {
  const draft = await copyRecipeTemplate({
    slug: HIDDEN_RECIPE, title: 'DRAFTRECIPETITLESENTINEL',
    description: 'DRAFTRECIPEDESCRIPTIONSENTINEL', publication_status: 'draft',
    main_ingredients: ['DRAFTRECIPEINGREDIENTSENTINEL'],
    photos: [{ src: HIDDEN_PHOTO, alt: 'DRAFTPHOTOALTSENTINEL', credit: 'Synthetic test image.' }],
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
  const blogFiles = [
    ...posts.map(post => ({ filename: post.filename, markdown: `---\n${stringify(post.data)}---\n${post.body}` })),
    ...blogFixtures.map(post => ({ filename: post.filename, markdown: `---\n${stringify(post.data)}---\n${post.body}` })),
    {
      filename: `${HIDDEN_BLOG}.md`,
      markdown: `${await copyBlogTemplate({
        slug: HIDDEN_BLOG, title: 'DRAFTBLOGTITLESENTINEL', description: 'DRAFTBLOGDESCRIPTIONSENTINEL',
        featured_recipe: HIDDEN_RECIPE,
        photos: [{ src: HIDDEN_PHOTO, alt: 'DRAFTPHOTOALTSENTINEL', credit: 'Synthetic test image.' }],
      })}\nDRAFTBLOGBODYSENTINEL`,
    },
  ];
  for (const post of blogFiles) {
    const path = join(blogDirectory, post.filename);
    await writeFile(path, post.markdown, { flag: 'wx' });
    created.push(path);
  }
  const originalPhotos = new Set([...originals, ...posts].flatMap(entry => (entry.data.photos ?? []).map(photo => photo.src)));
  for (const filename of originalPhotos) {
    const path = join(photoDirectory, filename);
    await writeFile(path, await readFile(join(process.cwd(), 'content', 'photos', filename)), { flag: 'wx' });
    created.push(path);
  }
  for (const [index, filename] of [BLOG_PHOTO, RECIPE_PHOTO, HIDDEN_PHOTO, UNUSED_PHOTO].entries()) {
    const path = join(photoDirectory, filename);
    const bytes = await sharp({ create: { width: 640 + index, height: 480 + index, channels: 3,
      background: { r: 40 + index * 50, g: 80, b: 120 } } }).webp().toBuffer();
    await writeFile(path, bytes, { flag: 'wx' });
    created.push(path);
  }
  await readRecipes(recipeDirectory);
  await readBlog(directory);
  build(directory);
  const outputPhotos = new Set<string>();
  for (const file of await generatedFiles(join(process.cwd(), 'dist'))) {
    if (file.endsWith('.webp')) outputPhotos.add(basename(file));
    const output = await decodedOutput(file);
    for (const sentinel of draftSentinels) {
      assert.ok(!output.includes(sentinel), `Draft leaked in ${file}: ${sentinel}`);
    }
  }
  assert.deepEqual(outputPhotos, new Set(publishedPhotoNames([...originals, ...posts, ...publishedFixtures, ...blogFixtures])),
    'Only photos referenced by published entries may be emitted');
} finally {
  for (const path of created) await unlink(path);
  await rmdir(recipeDirectory);
  await rmdir(blogDirectory);
  await rmdir(photoDirectory);
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
