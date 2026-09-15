import { basename, dirname, isAbsolute, join, resolve } from 'node:path';

export function contentDirectory(root = process.cwd()): string {
  const testDirectory = process.env.COOKBOOK_TEST_CONTENT_DIR;
  if (!testDirectory) return join(root, 'content');
  if (!isAbsolute(testDirectory) || dirname(resolve(testDirectory)) !== resolve(root)
    || !basename(testDirectory).startsWith('.test-build-')) {
    throw new Error('COOKBOOK_TEST_CONTENT_DIR must be a .test-build-* directory directly inside this checkout');
  }
  return testDirectory;
}
