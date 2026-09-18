interface Pagefind {
  search(query: string): Promise<{ results: { data(): Promise<{ url: string }> }[] }>;
}

let pagefind: Pagefind | undefined;

export async function searchPaths(query: string): Promise<Set<string>> {
  const modulePath = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/pagefind/pagefind.js`;
  pagefind ??= await import(/* @vite-ignore */ modulePath);
  const result = await pagefind!.search(query);
  const data = await Promise.all(result.results.map(item => item.data()));
  return new Set(data.map(item => new URL(item.url, location.origin).pathname));
}
