import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDocument } from 'yaml';

export async function readMarkdown(directory: string) {
  const files = (await readdir(directory, { withFileTypes: true })).filter(file => file.isFile() && file.name.endsWith('.md'));
  return Promise.all(files.map(async file => {
    const path = join(directory, file.name);
    const raw = await readFile(path, 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
    if (!match) throw new Error(`${path}: missing YAML frontmatter`);
    const doc = parseDocument(match[1], { uniqueKeys: true });
    if (doc.errors.length) throw new Error(`${path}: ${doc.errors.map(error => error.message).join('; ')}`);
    return { filename: file.name, data: doc.toJS() as unknown, body: match[2] };
  }));
}
