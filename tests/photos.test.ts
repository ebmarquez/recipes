import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, readFile, readdir, unlink, rmdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { photosSchema, photoHref } from '../src/lib/photo-contract.ts';
import { importPhoto, readPhoto, validatePhotos, publishedPhotoNames, PHOTO_MAX_EDGE } from '../src/lib/photos.ts';
import { recipeSchema } from '../src/lib/recipe-contract.ts';
import { blogSchema } from '../src/lib/blog.ts';
import { metadata } from './fixtures.ts';

const photo = { src: 'dinner.webp', alt: 'Soup in a bowl.', credit: 'Photo by the site owner.' };

test('photo contract requires safe local filenames, alt text and credit, and rejects duplicate photos', () => {
  assert.ok(photosSchema.safeParse([photo]).success);
  assert.ok(recipeSchema.safeParse({ ...metadata, photos: [photo] }).success);
  assert.ok(blogSchema.safeParse({
    title: 'Dinner', slug: 'dinner', description: 'Kitchen notes.', publication_status: 'draft',
    date_created: '2026-09-17', date_modified: '2026-09-17', date_published: null,
    featured_recipe: null, photos: [photo],
  }).success);
  for (const invalid of [
    { src: '../private.webp' }, { src: 'https://example.com/photo.webp' },
    { src: '..\\private.webp' }, { src: 'photo.jpg' }, { src: 'photo.svg' },
    { src: 'Photo.webp' }, { src: 'photo%2fprivate.webp' },
    { alt: '' }, { alt: '<script>' }, { credit: '' }, { credit: undefined },
    { caption: '<img>' }, { caption: '' }, { extra: 'unknown' },
  ]) assert.equal(photosSchema.safeParse([{ ...photo, ...invalid }]).success, false, JSON.stringify(invalid));
  assert.equal(photosSchema.safeParse([photo, photo]).success, false);
  assert.equal(photoHref(photo.src, '/recipes/'), '/recipes/photos/dinner.webp');
  assert.equal(photoHref(photo.src, '/'), '/photos/dinner.webp');
  assert.throws(() => recipeSchema.parse({ ...metadata, slug: 'photos' }), /Reserved/);
});

test('only published photo references are selected, deduplicated and sorted', () => {
  assert.deepEqual(publishedPhotoNames([
    { data: { publication_status: 'published', photos: [photo] } },
    { data: { publication_status: 'published', photos: [photo, { ...photo, src: 'another.webp' }] } },
    { data: { publication_status: 'draft', photos: [{ ...photo, src: 'secret.webp' }] } },
    { data: { publication_status: 'published' } },
  ]), ['another.webp', 'dinner.webp']);
});

test('photo import applies orientation, bounds size, strips metadata and never overwrites a file', async () => {
  const root = join(process.cwd(), 'test-results');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'photo-import-'));
  const input = join(directory, 'source.jpg');
  const destination = join(directory, 'photos');
  try {
    const original = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: 'orange' } })
      .withMetadata({ orientation: 6 })
      .withExifMerge({ IFD0: { Artist: 'PRIVATE-METADATA-SENTINEL' } }).jpeg().toBuffer();
    await writeFile(input, original);
    assert.ok((await sharp(original).metadata()).exif);
    await importPhoto(input, photo.src, directory);
    const output = await readPhoto(photo.src, directory);
    assert.equal(output.width, 800);
    assert.equal(output.height, PHOTO_MAX_EDGE);
    const result = await sharp(output.bytes).metadata();
    for (const value of [result.exif, result.xmp, result.iptc, result.icc, result.orientation]) assert.equal(value, undefined);
    assert.ok(!output.bytes.includes(Buffer.from('PRIVATE-METADATA-SENTINEL')));
    assert.deepEqual(await readFile(input), original, 'Source photo must remain untouched');
    await assert.rejects(importPhoto(input, photo.src, directory), /EEXIST/);
    await assert.rejects(importPhoto(input, '../outside.webp', directory), /local imported photo/);
    await assert.rejects(validatePhotos([{ filename: 'blog/missing.md',
      data: { publication_status: 'draft', photos: [{ ...photo, src: 'missing.webp' }] } }], directory),
    /blog\/missing.md: photos "missing.webp"/);
    const bad = join(destination, 'bad.webp');
    await writeFile(bad, Buffer.from('not an image'));
    await assert.rejects(readPhoto('bad.webp', directory));
    await writeFile(bad, await sharp(original).withMetadata().webp().toBuffer());
    await assert.rejects(readPhoto('bad.webp', directory), /use photo:add|metadata is not allowed/);
    await writeFile(bad, await sharp({ create: { width: 10, height: 10, channels: 3, background: 'blue' } })
      .withExifMerge({ IFD0: { Artist: 'private' } }).webp().toBuffer());
    await assert.rejects(readPhoto('bad.webp', directory), /metadata is not allowed/);
    await writeFile(input, '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
    await assert.rejects(importPhoto(input, 'svg.webp', directory), /still JPEG, PNG, or WebP/);
  } finally {
    await unlink(input);
    for (const filename of await readdir(destination)) await unlink(join(destination, filename));
    await rmdir(destination);
    await rmdir(directory);
  }
});
