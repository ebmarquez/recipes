import { importPhoto } from '../src/lib/photos.ts';

try {
  const [source, filename, ...extra] = process.argv.slice(2);
  if (!source || !filename || extra.length) {
    throw new Error('Usage: npm run photo:add -- "path\\to\\photo.jpg" dinner.webp');
  }
  const result = await importPhoto(source, filename);
  console.log(`Imported content/photos/${result.filename} (${result.bytes} bytes); orientation applied and embedded metadata removed. Add photos metadata to an entry; importing does not publish it.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
