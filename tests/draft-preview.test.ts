import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import sharp from 'sharp';
import { stringify } from 'yaml';
import { astroBin } from './build-helpers.ts';
import { entry, copyBlogTemplate } from './fixtures.ts';
import { SITE_BASE } from '../src/lib/site.ts';

test('development previews draft prose and photos without exposing them on public routes', { timeout: 90_000 }, async () => {
  const directory = await mkdtemp(join(process.cwd(), '.test-build-draft-preview-'));
  const files: string[] = [];
  const folders = ['recipes', 'blog', 'photos'].map(name => join(directory, name));
  for (const folder of folders) await mkdir(folder);
  const save = async (path: string, content: string | Buffer) => {
    await writeFile(path, content, { flag: 'wx' });
    files.push(path);
  };
  let child: ReturnType<typeof spawn> | undefined;
  let exited: Promise<void> | undefined;
  try {
    const recipe = entry();
    await save(join(directory, 'recipes', recipe.filename), `---\n${stringify(recipe.data)}---\n${recipe.body}`);
    await save(join(directory, 'sources.json'), '[]');
    const draft = await copyBlogTemplate({
      slug: 'preview-note', title: 'DRAFTBLOGPREVIEWSENTINEL', description: 'Synthetic draft for local preview tests.',
      featured_recipe: recipe.data.slug,
      photos: [{ src: 'preview-photo.webp', alt: 'Synthetic preview photograph', credit: 'Synthetic test image.' }],
    });
    const path = join(directory, 'blog', 'preview-note.md');
    await save(path, `${draft}\nDRAFTBLOGBODYSENTINEL`);
    const photo = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#345740' } }).webp().toBuffer();
    await save(join(directory, 'photos', 'preview-photo.webp'), photo);
    const origin = 'http://127.0.0.1:4333';
    const base = `${origin}${SITE_BASE}`;
    child = spawn(process.execPath, [astroBin, 'dev', '--host', '127.0.0.1', '--port', '4333'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', COOKBOOK_TEST_CONTENT_DIR: directory },
    });
    let output = '';
    child.stdout?.on('data', chunk => { output += String(chunk); });
    child.stderr?.on('data', chunk => { output += String(chunk); });
    let processError: Error | undefined;
    child.on('error', error => { processError = error; });
    exited = new Promise(resolve => child!.once('close', () => resolve()));
    const deadline = Date.now() + 60_000;
    let ready = false;
    while (!ready && Date.now() < deadline) {
      if (processError) throw processError;
      if (child.exitCode !== null) throw new Error(`Draft preview server exited: ${output}`);
      try {
        const response = await fetch(`${base}local-drafts/`, { signal: AbortSignal.timeout(5000) });
        const html = await response.text();
        assert.equal(response.status, 200, html);
        assert.ok(html.includes('DRAFTBLOGPREVIEWSENTINEL'), html);
        ready = true;
      } catch (error) {
        if (!(error instanceof TypeError && error.cause instanceof Error && 'code' in error.cause && error.cause.code === 'ECONNREFUSED')) throw error;
        await setTimeout(200);
      }
    }
    assert.ok(ready, `Draft preview server did not become ready: ${output}`);
    const query = `?note=two%20bowls&return=${encodeURIComponent(SITE_BASE)}`;
    for (const path of ['local-drafts', 'local-drafts/blog/preview-note']) {
      for (const method of ['GET', 'HEAD']) {
        const redirect = await fetch(`${base}${path}${query}`, { method, redirect: 'manual' });
        assert.equal(redirect.status, 307, `${method} ${path} should redirect instead of showing a trailing-slash warning`);
        assert.equal(redirect.headers.get('location'), `${SITE_BASE}${path}/${query}`);
        assert.equal(redirect.headers.get('cache-control'), 'no-store');
      }
      const followed = await fetch(`${base}${path}${query}`);
      assert.equal(followed.status, 200);
      assert.equal(followed.url, `${base}${path}/${query}`);
    }
    const postUrl = `${base}local-drafts/blog/preview-note/`;
    const response = await fetch(postUrl);
    const html = await response.text();
    assert.equal(response.status, 200, html);
    assert.equal(response.redirected, false);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.ok(html.includes('DRAFTBLOGBODYSENTINEL'));
    assert.ok(html.includes('Local draft preview'));
    assert.ok(html.includes('content="noindex, follow"'));
    assert.ok(!html.includes('rel="canonical"') && !html.includes('data-pagefind-body'));
    assert.ok(html.includes(`${SITE_BASE}${recipe.data.slug}/`));
    assert.ok(html.includes(`src="${SITE_BASE}local-drafts/photos/preview-photo.webp"`));
    const image = await fetch(`${base}local-drafts/photos/preview-photo.webp`);
    assert.equal(image.status, 200, `Draft image ${image.url}: ${output}`);
    assert.equal(image.redirected, false, 'Photo filenames must not receive trailing slashes');
    assert.equal(image.headers.get('cache-control'), 'no-store');
    assert.equal(image.headers.get('content-type'), 'image/webp');
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), photo);
    for (const route of ['blog/preview-note/', 'photos/preview-photo.webp', 'local-drafts/blog/missing/', 'local-drafts/photos/missing.webp']) {
      assert.equal((await fetch(`${base}${route}`)).status, 404, route);
    }
    for (const route of ['', 'blog/', 'search/', 'sitemap.xml']) {
      const content = await (await fetch(`${base}${route}`)).text();
      assert.ok(!content.includes('DRAFTBLOGPREVIEWSENTINEL') && !content.includes('DRAFTBLOGBODYSENTINEL'), route);
    }
    await writeFile(path, `${draft}\nDRAFTBLOGUPDATEDSENTINEL`);
    assert.ok((await (await fetch(postUrl)).text()).includes('DRAFTBLOGUPDATEDSENTINEL'), 'Reload must show the current draft, not cached prose');
    await save(join(directory, 'blog', 'new-preview.md'), await copyBlogTemplate({
      slug: 'new-preview', title: 'DRAFTBLOGNEWSENTINEL', featured_recipe: null,
    }));
    const newPost = await fetch(`${base}local-drafts/blog/new-preview/`);
    assert.equal(newPost.status, 200, 'New drafts must be available without restarting the server');
    assert.ok((await newPost.text()).includes('DRAFTBLOGNEWSENTINEL'));
  } finally {
    child?.kill();
    if (exited) await exited;
    for (const path of files) await unlink(path);
    for (const folder of folders) await rmdir(folder);
    await rmdir(directory);
  }
});
