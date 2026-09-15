import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDocument } from 'yaml';
import { validateRecipes } from './recipe-contract.ts';
import { contentDirectory } from './content-directory.ts';

export async function readRecipes(directory = join(contentDirectory(), 'recipes')) {
  const files = (await readdir(directory, { withFileTypes: true })).filter(file => file.isFile() && file.name.endsWith('.md'));
  const input = await Promise.all(files.map(async file => {
    const raw = await readFile(join(directory, file.name), 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
    if (!match) throw new Error(`${file.name}: missing YAML frontmatter`);
    const doc = parseDocument(match[1], { uniqueKeys: true });
    if (doc.errors.length) throw new Error(`${file.name}: ${doc.errors.map(error => error.message).join('; ')}`);
    return { filename: file.name, data: doc.toJS(), body: match[2] };
  }));
  return validateRecipes(input);
}
