import { lstat, readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import sharp from 'sharp';
import { contentDirectory } from './content-directory.ts';
import { photoFilename, type Photo } from './photo-contract.ts';

export const PHOTO_MAX_EDGE = 1600;
type PhotoEntry = { data: { photos?: Photo[]; publication_status: 'draft' | 'published' } };

export function publishedPhotoNames(entries: PhotoEntry[]): string[] {
  return [...new Set(entries.filter(entry => entry.data.publication_status === 'published')
    .flatMap(entry => (entry.data.photos ?? []).map(photo => photo.src)))].sort();
}

export async function readPhoto(filename: string, root = contentDirectory()) {
  photoFilename.parse(filename);
  const directory = join(root, 'photos');
  const path = join(directory, filename);
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`${filename}: photo must be a regular local file`);
  if (dirname(await realpath(path)) !== join(await realpath(root), 'photos')) {
    throw new Error(`${filename}: photo must stay inside content/photos`);
  }
  if (info.size > 10 * 1024 * 1024) throw new Error(`${filename}: imported photo exceeds 10 MB`);
  const bytes = await readFile(path);
  const metadata = await sharp(bytes).metadata();
  if (metadata.format !== 'webp' || !metadata.width || !metadata.height
    || metadata.width > PHOTO_MAX_EDGE || metadata.height > PHOTO_MAX_EDGE
    || (metadata.pages ?? 1) !== 1) {
    throw new Error(`${filename}: use photo:add to create a still WebP at most ${PHOTO_MAX_EDGE}px per edge`);
  }
  if (metadata.exif || metadata.xmp || metadata.iptc || metadata.icc || metadata.orientation) {
    throw new Error(`${filename}: embedded metadata is not allowed; re-import with photo:add`);
  }
  await sharp(bytes).stats();
  return { bytes, width: metadata.width, height: metadata.height };
}

export async function validatePhotos(entries: (PhotoEntry & { filename: string })[], root = contentDirectory()) {
  for (const entry of entries) {
    for (const photo of entry.data.photos ?? []) {
      try {
        await readPhoto(photo.src, root);
      } catch (error) {
        throw new Error(`${entry.filename}: photos "${photo.src}": ${error instanceof Error ? error.message : String(error)}`, { cause: error });
      }
    }
  }
}

export async function importPhoto(source: string, filename: string, root = contentDirectory()) {
  photoFilename.parse(filename);
  const info = await lstat(source);
  if (!info.isFile() || info.size > 40 * 1024 * 1024) {
    throw new Error('Photo input must be a regular file no larger than 40 MB');
  }
  const input = await readFile(source);
  const image = sharp(input, { limitInputPixels: 40_000_000 });
  const metadata = await image.metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) !== 1) {
    throw new Error('Photo input must be a still JPEG, PNG, or WebP');
  }
  const bytes = await image.rotate()
    .resize({ width: PHOTO_MAX_EDGE, height: PHOTO_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 }).toBuffer();
  const directory = join(root, 'photos');
  await mkdir(directory, { recursive: true });
  if (await realpath(directory) !== join(await realpath(root), 'photos')) {
    throw new Error('Photo destination must not be a symbolic link outside content/photos');
  }
  await writeFile(join(directory, filename), bytes, { flag: 'wx' });
  return { filename, bytes: bytes.length };
}
