import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export { generatedFiles, decodedOutput } from '../src/lib/output-files.ts';

const require = createRequire(import.meta.url);
export const astroBin = join(dirname(require.resolve('astro/package.json')), 'bin', 'astro.mjs');
const pagefindBin = join(dirname(fileURLToPath(import.meta.resolve('pagefind'))), 'runner', 'bin.cjs');

export function build(contentDirectory?: string) {
  for (const [script, args] of [[astroBin, ['build']], [pagefindBin, ['--site', 'dist']]] as const) {
    const result = spawnSync(process.execPath, [script, ...args], {
      stdio: 'inherit',
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', COOKBOOK_TEST_CONTENT_DIR: contentDirectory ?? '' },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Build failed: ${script} (exit ${result.status})`);
  }
}
