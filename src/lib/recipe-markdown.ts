import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import type { Root, RootContent, Heading, ListItem, Text, Link } from 'mdast';
import type { Node } from 'unist';
import { isSafeExternalUrl } from './recipe-contract.ts';
import type { RecipeEntry } from './recipe-contract.ts';
import { isPublished, recipeHref } from './publication.ts';

const parser = unified().use(remarkParse).use(remarkGfm);
type TreeNode = Node & { children?: TreeNode[] };
export type MarkdownEntry = Pick<RecipeEntry, 'filename' | 'body'> & {
  data: Pick<RecipeEntry['data'], 'slug' | 'publication_status'>;
};

function walk(node: TreeNode, action: (node: TreeNode) => void) {
  action(node);
  node.children?.forEach(child => walk(child, action));
}

function sectionName(node: Heading): string {
  const name = toString(node).trim().toLowerCase();
  if (name === 'instructions' || name === 'directions') return 'directions';
  return name;
}

function setHeadings(tree: Root): Set<string> {
  const slugger = new GithubSlugger();
  slugger.slug('main');
  slugger.slug('print-recipe');
  const ids = new Set<string>();
  walk(tree, node => {
    if (node.type !== 'heading') return;
    const heading = node as Heading;
    const id = slugger.slug(sectionName(heading));
    heading.data = { ...heading.data, hProperties: { id, tabIndex: -1 } };
    ids.add(id);
  });
  return ids;
}

function resolveLink(url: string, entry: MarkdownEntry, entries: RecipeEntry[], posts?: MarkdownEntry[]): { target?: MarkdownEntry; fragment: string; blog?: boolean } {
  const fail = (detail: string): never => { throw new Error(`${entry.filename}: invalid link URL "${url}": ${detail}`); };
  if (isSafeExternalUrl(url)) return { fragment: '' };
  const local = url.match(/^(?:(\.\.\/(?:\.\.\/)?)([a-z0-9]+(?:-[a-z0-9]+)*)\/)?(#[^?#/\\\s]+)?$/);
  if (!local || !url || (!posts && local[1] === '../../')) {
    return fail(posts ? 'use HTTPS, #heading, ../post-slug/, or ../../recipe-slug/' : 'use HTTPS, a local #heading, or ../recipe-slug/');
  }
  const blog = !!posts && local[1] !== '../../';
  const targets = blog ? posts! : entries;
  const target = local[2] ? targets.find(item => item.data.slug === local[2]) : entry;
  if (!target) return fail(`unknown ${blog ? 'blog' : 'recipe'} slug (check for a typo)`);
  const fragment = local[3] ?? '';
  if (fragment) {
    let heading: string;
    try {
      heading = decodeURIComponent(fragment.slice(1));
    } catch {
      return fail('malformed heading fragment');
    }
    if (!setHeadings(parser.parse(target.body)).has(heading)) return fail('unknown heading fragment');
  }
  return { target, fragment, blog };
}

function prepareTree(entry: MarkdownEntry, entries: RecipeEntry[], posts?: MarkdownEntry[]): Root {
  const tree = parser.parse(entry.body);
  const definitions = new Map<string, string>();
  walk(tree, node => {
    if (node.type === 'definition') {
      const definition = node as Extract<RootContent, { type: 'definition' }>;
      if (definitions.has(definition.identifier)) throw new Error(`${entry.filename}: duplicate link definition "${definition.identifier}"`);
      definitions.set(definition.identifier, definition.url);
      resolveLink(definition.url, entry, entries, posts);
    }
    if (node.type === 'html') throw new Error(`${entry.filename}: raw HTML is not allowed; use Markdown`);
    if (node.type === 'heading') {
      const heading = node as Heading;
      if (heading.depth === 1) throw new Error(`${entry.filename}: use level-two headings; the page provides the title`);
      if (!posts && ['ingredients', 'directions'].includes(sectionName(heading)) && heading.depth !== 2) throw new Error(`${entry.filename}: Ingredients and Instructions/Directions must use level-two headings`);
    }
    if (node.type === 'image' || node.type === 'imageReference') throw new Error(`${entry.filename}: inline images are not supported; import a local photo and use the photos metadata`);
    if (node.type === 'text' && /\[\[.*?\]\]/.test((node as Text).value)) throw new Error(`${entry.filename}: wikilinks are not supported`);
  });
  walk(tree, node => {
    if (node.type === 'linkReference') {
      const reference = node as Extract<RootContent, { type: 'linkReference' }>;
      const url = definitions.get(reference.identifier);
      if (!url) throw new Error(`${entry.filename}: unresolved link reference "${reference.identifier}"`);
      Object.assign(node, { type: 'link', url });
    }
    if (node.type === 'link') resolveLink((node as Link).url, entry, entries, posts);
  });
  setHeadings(tree);
  return tree;
}

export function validateMarkdown(entry: RecipeEntry, entries: RecipeEntry[]): void {
  const tree = prepareTree(entry, entries);
  let section = '';
  let ingredients = 0;
  let directions = 0;
  let step = 0;
  let stepHasText = true;
  const sections = new Set<string>();
  for (const node of tree.children) {
    if (node.type === 'heading' && node.depth <= 2) {
      if (!stepHasText) throw new Error(`${entry.filename}: Instructions step needs text`);
      section = sectionName(node);
      if (sections.has(section)) throw new Error(`${entry.filename}: duplicate section "${section}"`);
      sections.add(section);
    }
    if (section === 'directions' && node.type === 'heading' && node.depth === 3) {
      const match = toString(node).match(/^Step (\d+):\s+\S/i);
      if (!match || Number(match[1]) !== ++step || !stepHasText) throw new Error(`${entry.filename}: Instructions step headings must be sequential: Step 1: Title`);
      stepHasText = false;
    }
    if (section === 'directions' && step && node.type === 'paragraph' && toString(node).trim()) {
      if (!stepHasText) directions++;
      stepHasText = true;
    }
    if (node.type === 'list') {
      if (section === 'ingredients' && !node.ordered) ingredients += node.children.filter(child => toString(child).trim()).length;
      if (section === 'directions' && node.ordered) directions += node.children.filter(child => toString(child).trim()).length;
    }
  }
  if (!ingredients || !directions || !stepHasText) throw new Error(`${entry.filename}: include Ingredients with a bullet list and Instructions or Directions with a numbered list or numbered Step headings`);
}

export async function renderRecipe(entry: RecipeEntry, entries: RecipeEntry[], base: string): Promise<{ html: string }> {
  return renderMarkdown(entry, entries, base);
}

export function validateBlogMarkdown(entry: MarkdownEntry, entries: RecipeEntry[], posts: MarkdownEntry[]): void {
  if (!entry.body.trim()) throw new Error(`${entry.filename}: blog body must not be empty`);
  prepareTree(entry, entries, posts);
}

export async function renderBlog(entry: MarkdownEntry, entries: RecipeEntry[], posts: MarkdownEntry[], base: string): Promise<{ html: string }> {
  return renderMarkdown(entry, entries, base, posts);
}

async function renderMarkdown(entry: MarkdownEntry, entries: RecipeEntry[], base: string, posts?: MarkdownEntry[]): Promise<{ html: string }> {
  const tree = prepareTree(entry, entries, posts);
  function rewrite(parent: TreeNode) {
    if (!parent.children) return;
    parent.children = parent.children.flatMap(node => {
      rewrite(node);
      if (node.type === 'definition') return [];
      if (node.type !== 'link') return [node];
      const link = node as Extract<RootContent, { type: 'link' }>;
      const { target, fragment, blog } = resolveLink(link.url, entry, entries, posts);
      if (!target) return [node];
      if (!isPublished(target.data) && !(target === entry && fragment)) return node.children ?? [];
      link.url = target === entry && fragment
        ? fragment : `${recipeHref(`${blog ? 'blog/' : ''}${target.data.slug}`, base)}${fragment}`;
      return [node];
    });
  }
  rewrite(tree);
  walk(tree, node => {
    if (node.type === 'listItem') (node as ListItem).checked = null;
  });
  if (posts) {
    const processor = unified().use(remarkRehype).use(rehypeStringify);
    return { html: processor.stringify(await processor.run(tree)) };
  }
  let section = '';
  let ingredient = 0;
  const headingIds = setHeadings(tree);
  for (const node of tree.children) {
    if (node.type === 'heading' && node.depth <= 2) section = sectionName(node);
    if (section !== 'ingredients' || node.type !== 'list' || node.ordered) continue;
    walk(node, item => {
      if (item.type !== 'listItem') return;
      const listItem = item as ListItem;
      let id = `ingredient-${++ingredient}`;
      while (headingIds.has(id)) id = `ingredient-${++ingredient}`;
      // Pagefind skips labels; index text derived from this same Markdown item.
      const ingredientText = listItem.children.filter(child => child.type !== 'list').map(child => toString(child)).join(' ');
      listItem.data = { ...listItem.data, hProperties: {
        className: ['ingredient'],
        'data-ingredient-id': id,
        'data-ingredient-text': ingredientText,
        'data-pagefind-index-attrs': 'data-ingredient-text',
      } };
    });
  }
  const processor = unified().use(remarkRehype).use(() => (htmlTree: TreeNode) => {
    walk(htmlTree, node => {
      type Element = TreeNode & { type: 'element'; tagName: string; properties: Record<string, unknown>; children: TreeNode[] };
      if (node.type !== 'element') return;
      const element = node as Element;
      const id = element.properties['data-ingredient-id'];
      if (typeof id !== 'string') return;
      delete element.properties['data-ingredient-id'];
      // Keep nested lists outside the label; their own ingredients get independent controls.
      const nested = element.children.filter(child => child.type === 'element' && ['ul', 'ol'].includes((child as Element).tagName));
      const content = element.children.filter(child => !nested.includes(child)).flatMap(child =>
        child.type === 'element' && (child as Element).tagName === 'p' ? child.children ?? [] : [child]);
      element.children = [
        { type: 'element', tagName: 'input', properties: { type: 'checkbox', id }, children: [] } as Element,
        { type: 'element', tagName: 'label', properties: { htmlFor: id }, children: content } as Element,
        ...nested,
      ];
    });
  }).use(rehypeStringify);
  return { html: processor.stringify(await processor.run(tree)) };
}
