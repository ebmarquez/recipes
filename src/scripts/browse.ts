import { matchesFilters } from '../lib/publication.ts';

interface Pagefind {
  search(query: string): Promise<{ results: { data(): Promise<{ url: string }> }[] }>;
}
const form = document.querySelector<HTMLFormElement>('#recipe-filters')!;
const search = document.querySelector<HTMLInputElement>('#recipe-search')!;
const cuisine = document.querySelector<HTMLSelectElement>('#cuisine')!;
const category = document.querySelector<HTMLSelectElement>('#category')!;
const ingredient = document.querySelector<HTMLSelectElement>('#ingredient')!;
const time = document.querySelector<HTMLSelectElement>('#time')!;
const status = document.querySelector<HTMLElement>('#results-status')!;
const errorMessage = document.querySelector<HTMLElement>('#search-error')!;
const noResults = document.querySelector<HTMLElement>('#no-results')!;
const cards = [...document.querySelectorAll<HTMLElement>('[data-recipe-card]')].map(element => ({
  element,
  data: JSON.parse(element.dataset.filter!) as Parameters<typeof matchesFilters>[0],
  url: element.dataset.url!,
}));
let pagefind: Pagefind | undefined;
let revision = 0;
let timer: ReturnType<typeof setTimeout>;

async function update() {
  const current = ++revision;
  const query = search.value.trim();
  const params = new URLSearchParams();
  for (const control of [search, cuisine, category, ingredient, time]) {
    if (control.value.trim()) params.set(control.name, control.value.trim());
  }
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`);
  errorMessage.hidden = true;
  let matched: Set<string> | undefined;
  if (query) {
    status.textContent = 'Searching recipes…';
    try {
      const modulePath = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/pagefind/pagefind.js`;
      pagefind ??= await import(/* @vite-ignore */ modulePath);
      const result = await pagefind!.search(query);
      const data = await Promise.all(result.results.map(item => item.data()));
      matched = new Set(data.map(item => new URL(item.url, location.origin).pathname));
    } catch (error) {
      if (current !== revision) return;
      console.error('Recipe search failed', error);
      errorMessage.textContent = 'Search is unavailable. Browse using the filters below, or try again. For local search, run npm run build then npm run preview.';
      errorMessage.hidden = false;
    }
  }
  if (current !== revision) return;
  let count = 0;
  for (const card of cards) {
    const visible = (!matched || matched.has(card.url)) && matchesFilters(card.data, {
      cuisine: cuisine.value, category: category.value, ingredient: ingredient.value,
      maxMinutes: time.value ? Number(time.value) : undefined,
    });
    card.element.hidden = !visible;
    if (visible) count++;
  }
  status.textContent = `${count} ${count === 1 ? 'recipe' : 'recipes'}${!errorMessage.hidden ? ' shown (search unavailable)' : ''}`;
  noResults.hidden = count !== 0;
}

function restore() {
  const params = new URLSearchParams(location.search);
  for (const control of [search, cuisine, category, ingredient, time]) {
    control.value = params.get(control.name) ?? '';
    if (control instanceof HTMLSelectElement && control.selectedIndex < 0) control.value = '';
  }
  void update();
}
form.hidden = false;
document.querySelector<HTMLElement>('#browse-help')!.hidden = true;
form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); void update(); });
form.addEventListener('input', () => {
  ++revision;
  clearTimeout(timer);
  timer = setTimeout(() => void update(), 180);
});
form.addEventListener('reset', () => {
  ++revision;
  clearTimeout(timer);
  setTimeout(() => void update(), 0);
});
window.addEventListener('popstate', restore);
restore();
