import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const astroBin = join(dirname(require.resolve('astro/package.json')), 'bin', 'astro.mjs');
const pagefindBin = join(dirname(fileURLToPath(import.meta.resolve('pagefind'))), 'runner', 'bin.cjs');

export function build() {
  for (const [script, args] of [[astroBin, ['build']], [pagefindBin, ['--site', 'dist']]] as const) {
    const result = spawnSync(process.execPath, [script, ...args], {
      stdio: 'inherit',
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Build failed: ${script} (exit ${result.status})`);
  }
}

export async function generatedFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? generatedFiles(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}

export async function decodedOutput(file: string): Promise<string> {
  const buffer = await readFile(file);
  return (buffer[0] === 0x1f && buffer[1] === 0x8b ? gunzipSync(buffer) : buffer).toString('utf8');
}
