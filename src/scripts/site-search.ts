import { searchPaths } from '../lib/search.ts';

const form = document.querySelector<HTMLFormElement>('#site-search-form')!;
const input = document.querySelector<HTMLInputElement>('#site-search')!;
const status = document.querySelector<HTMLElement>('#site-search-status')!;
const errorMessage = document.querySelector<HTMLElement>('#site-search-error')!;
const empty = document.querySelector<HTMLElement>('#site-search-empty')!;
const cards = [...document.querySelectorAll<HTMLElement>('[data-search-card]')];
let revision = 0;
let timer: ReturnType<typeof setTimeout>;

async function update() {
  const current = ++revision;
  const query = input.value.trim();
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
  errorMessage.hidden = true;
  let matches: Set<string> | undefined;
  if (query) {
    status.textContent = 'Searching recipes and posts...';
    try {
      matches = await searchPaths(query);
    } catch (error) {
      if (current !== revision) return;
      console.error('Site search failed', error);
      errorMessage.textContent = 'Search is unavailable. All published entries are shown below. For local search, run npm run build then npm run preview.';
      errorMessage.hidden = false;
    }
  }
  if (current !== revision) return;
  let count = 0;
  for (const card of cards) {
    card.hidden = !!matches && !matches.has(card.dataset.url!);
    if (!card.hidden) count++;
  }
  status.textContent = `${count} ${count === 1 ? 'result' : 'results'}${errorMessage.hidden ? '' : ' shown (search unavailable)'}`;
  empty.hidden = count !== 0;
}

function restore() {
  input.value = new URLSearchParams(location.search).get('q') ?? '';
  void update();
}
form.hidden = false;
document.querySelector<HTMLElement>('#site-search-fallback')!.hidden = true;
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
