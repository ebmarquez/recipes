import { matchesFilters } from '../lib/publication.ts';

const form = document.querySelector<HTMLFormElement>('#recipe-filters')!;
const search = document.querySelector<HTMLInputElement>('#recipe-search')!;
const cuisine = document.querySelector<HTMLSelectElement>('#cuisine')!;
const category = document.querySelector<HTMLSelectElement>('#category')!;
const ingredient = document.querySelector<HTMLSelectElement>('#ingredient')!;
const time = document.querySelector<HTMLSelectElement>('#time')!;
const status = document.querySelector<HTMLElement>('#results-status')!;
const noResults = document.querySelector<HTMLElement>('#no-results')!;
const cards = [...document.querySelectorAll<HTMLElement>('[data-recipe-card]')].map(element => ({
  element,
  data: JSON.parse(element.dataset.filter!) as Parameters<typeof matchesFilters>[0],
  searchText: normalizeSearchText(element.dataset.searchText!),
}));
let revision = 0;
let timer: ReturnType<typeof setTimeout>;

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesSearch(searchText: string, query: string): boolean {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  return terms.every(term => searchText.split(' ').includes(term));
}

function update() {
  const current = ++revision;
  const query = search.value.trim();
  const params = new URLSearchParams();
  for (const control of [search, cuisine, category, ingredient, time]) {
    if (control.value.trim()) params.set(control.name, control.value.trim());
  }
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`);
  if (current !== revision) return;
  let count = 0;
  for (const card of cards) {
    const visible = (!query || matchesSearch(card.searchText, query)) && matchesFilters(card.data, {
      cuisine: cuisine.value, category: category.value, ingredient: ingredient.value,
      maxMinutes: time.value ? Number(time.value) : undefined,
    });
    card.element.hidden = !visible;
    if (visible) count++;
  }
  status.textContent = `${count} ${count === 1 ? 'recipe' : 'recipes'}`;
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
form.addEventListener('input', event => {
  ++revision;
  clearTimeout(timer);
  if (event.target instanceof HTMLSelectElement) void update();
  else timer = setTimeout(() => void update(), 180);
});
form.addEventListener('reset', () => {
  ++revision;
  clearTimeout(timer);
  setTimeout(() => void update(), 0);
});
window.addEventListener('popstate', restore);
restore();
