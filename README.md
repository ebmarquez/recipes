# The Everyday Table

Practical recipes for home cooks. A text-first, mobile-friendly Astro cookbook
with ingredient search, honest timing filters, readable recipe pages, and print styles.

## Private pilot: release gate

**The repository is PRIVATE. No site is live. There is no deployment workflow.**
`publication_status: published` only includes a recipe in the generated private
pilot; it is **not permission to publish the source or deploy a public website**.
The site emits `noindex, nofollow`, but this is not access control.

Before phase 4, the owner must explicitly approve rights and source review,
the code/content licensing policy, repository visibility, and deployment.
Source credit is not a license. Missing source metadata is not proof of ownership.
No license grant is implied by this repository. Do not import private vault notes,
history, unreviewed recipes, clippings, or personal schedules.
Draft flags do not protect files or history in a public repository.

There are no public canonical URLs, sitemap, feed, analytics, external images,
remote fonts, recipe JSON-LD, ratings, accounts, comments, or serving auto-scaling.
A sitemap and canonical origin belong to an owner-approved release, not this pilot.
Any future generated surface must use the same publication selector.

## Run locally

Use **Node.js 26.7+ within major 26** and **npm 11**. The installed Astro 7.3.1
declares Node `>=22.12.0`; this project deliberately requires Node 26 for the
tested native TypeScript scripts. The initial scaffold requested Astro 7.3.2,
which was unavailable from the registry; the lockfile records available 7.3.1.

From `C:\Users\emarq\repo\recipes`:

```powershell
npm ci
npm run build
npm run preview
```

Open **<http://127.0.0.1:4321/recipes/>**. The server binds to loopback only.
Stop it with Ctrl+C. Nothing is deployed.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local authoring at `/recipes/`, with recipe change watching |
| `npm run test:content` | Shared contract, rendering, links, publication tests; validate actual content |
| `npm run check` | Astro and TypeScript diagnostics |
| `npm run build` | Validate content, generate static HTML, build the actual Pagefind index |
| `npm run preview` | Serve `dist` locally at `/recipes/`, including working search |
| `npm run test:e2e` | Chromium tests, synthetic draft build, leak checks, and clean rebuild |

Search requires the generated Pagefind index. Use **build + preview**, not `dev`,
to test search. If loading the index fails, readers get a visible error and can
still browse with filters. Without JavaScript, all cards, recipes, ingredient
checkboxes, jump links, and browser printing remain available.

## Validation

```powershell
npm run test:content
npm run check
npm run build
npm run test:e2e
npx markdownlint README.md docs\authoring.md
```

If Playwright reports a missing Chromium binary, install it and retry:

```powershell
npx playwright install chromium
npm run test:e2e
```

The content suite verifies the actual authoring template, including drafts with
unknown source credit and the stricter credit requirement for published recipes.
The browser suite starts its own loopback server on port 4322; it refuses to reuse
another process. It exclusively creates two named synthetic fixtures (including
a template-derived draft), builds,
checks output (including compressed search data) for draft leakage, and removes
only those fixtures. Existing recipes are checked byte-for-byte. The suite tests
the synthetic unknown-time soup alongside the three approved pilot recipes, then
rebuilds clean output. Do not edit recipes or run another build during this suite.
If a process is forcibly terminated, inspect any `test-pilot-*` files before
removing only confirmed test fixtures and rebuilding.

Browser coverage includes real ingredient search, combined filters, unknown and
zero-minute timing, draft exclusion, related links, direct base paths, search
failure, no-JavaScript reading, jump links, print, labeled checkboxes, and 390px
overflow/focus checks. The pilot-count assertion is intentionally in tests only;
update it when the approved pilot expands.

CI has read-only repository permissions and runs checks without deployment,
artifact upload, or repository modifications. It does not replace owner review.

## Architecture

| Path | Responsibility |
| --- | --- |
| `content\recipes\*.md` | Reviewed recipe metadata and Markdown body |
| `src\lib\recipe-contract.ts` | Single runtime Zod schema and collection validation |
| `src\lib\recipe-markdown.ts` | Markdown validation, links, ingredients, tables, safe rendering |
| `src\lib\publication.ts` | Published-only selection, recent ordering, URLs, filter semantics |
| `src\content.config.ts` | Astro collection loader; drafts never enter the content store |
| `src\pages\[slug].astro` | Recipe routes; no extra `recipes` directory |
| `src\pages\index.astro` | Recent recipe cards, search, filters |
| `src\styles` | Cream/ink/herb palette, system fonts, responsive and print styles |
| `tests` | Synthetic fixtures, content tests, and browser/build regression coverage |

Routes honor Astro's base: `/recipes/calabacitas/`, not
`/recipes/recipes/calabacitas/`. The home page orders recipes by genuine publication
date when present, otherwise modified/created date, with a stable title tie-break.
Only `published` entries become routes, cards, filter data, or indexed pages.
Related links to known drafts become plain text; unknown slugs fail the build.

See [Authoring recipes](docs/authoring.md) for the contract and review workflow.
