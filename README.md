# The Everyday Table

Practical recipes for home cooks. A mobile-friendly Astro cookbook with
ingredient search, honest timing filters, readable directions, and print styles.
This is a public personal collection of recipes the owner has made or wants to
make. Sources are credited and linked where known; inclusion does not mean
every recipe has been tested.

**Site address:** <https://ebmarquez.github.io/recipes/>

## Public publishing workflow

This repository is public. The owner approved public hosting and the release of
editorially reviewed recipes whose rights they confirmed, including uncredited
recipes. Externally credited material is represented by **link-only references**
in the source library, not copied recipe instructions.

`publication_status: published` includes an owner-approved entry in the public
build. New recipes and source references still start as `draft`; future
publication needs owner review. A successful Pages deployment, not a metadata
change or this README, confirms that a release is live.
The September 14, 2026 release date is the approved intended launch date; the
owner confirms it against the successful deployment.

Draft status only controls generated output. Source files, branches, PRs, and
history in this public repository remain public. Keep private notes, schedules,
health details, credentials, journals, and rights-unclear material outside it.
There is no dependency on, or ingestion from, any personal/work vault.

### Rights and reuse

Publishing approval is not a blanket reuse license. **No additional license is
granted for site code or recipe content**; no MIT or Creative Commons grant is
implied. Third-party rights remain with their respective owners. No claim of
exclusive copyright over AI-only output is made. Attribution does not itself
permit copying protected prose or images, and missing attribution is not proof
of originality. AI assistance is credited honestly; no real chef credentials,
physical testing, ratings, or clinical claims are invented.

## Run locally

Use **Node.js 26.7+ within major 26** and **npm 11**. Astro 7.3.1 declares Node
`>=22.12.0`; this project uses the tested Node 26 runtime for native TypeScript
scripts. The lockfile records the available Astro 7.3.1 release.

From the root of your cookbook checkout:

```powershell
npm ci
npm run build
npm run preview
```

Open **<http://127.0.0.1:4321/recipes/>**. Local servers bind only to loopback;
stop them with Ctrl+C. A local build or preview does not deploy anything.
Canonicals and sitemap URLs intentionally use the public Pages address even
when previewed locally.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local authoring at `/recipes/`, with recipe change watching |
| `npm run test:content` | Contract, link, source, publication, workflow, and template tests; validate current content |
| `npm run check` | Astro and TypeScript diagnostics |
| `npm run lint:docs` | Lint README, both root agent guides, docs, and all `.github` Markdown |
| `npm run build` | Validate content, generate static HTML/crawler files, and build Pagefind |
| `npm run preview` | Serve `dist` locally with working search |
| `npm run test:e2e` | Browser tests against an isolated fixture build, followed by a real-content rebuild |
| `npm run verify:output` | Verify the clean deployment output against the current published collection |

Search needs the generated Pagefind index: use **build + preview**, not `dev`.
Search covers full hosted recipes only, not external source cards.
Without JavaScript, all recipes, source links, ingredient checkboxes, jump links,
and browser printing remain available.

## Validation and fixture isolation

```powershell
npm run test:content
npm run check
npm run lint:docs
npm run build
npm run test:e2e
npm run verify:output
```

If Playwright reports a missing Chromium binary:

```powershell
npx playwright install chromium
npm run test:e2e
```

The browser suite owns a loopback server on port **4332** and refuses to reuse
another process. It copies current content into a fresh `.test-build-*` directory
in this checkout and adds synthetic recipes and source cards there. It never
edits `content\recipes` or `content\sources.json`. Synthetic cases cover unknown,
zero, exact-30, and over-30-minute timing, cuisine/category variety, numbered step
headings, a template-derived draft, and unpublished source references.
The tests derive real recipe/source counts from the collections, not a pilot list.

Only test builds receive the internal `COOKBOOK_TEST_CONTENT_DIR` override.
Do not set it for authoring or release builds. Staged content is removed after
building; the suite scans all generated files, including compressed Pagefind
data, for draft sentinels. Teardown rebuilds from real content and verifies that
no fixtures remain. Release verification refuses test overrides and rejects
unexpected HTML pages, fixture markers, missing publication dates, and incorrect
canonicals, sitemap entries, source counts, or Pagefind recipe counts.

Do not edit content or run a second build while validation is running. If a test
process is forcibly terminated, inspect its specific `.test-build-*` directory,
remove only confirmed test artifacts, then build and verify real content again.
Nothing from a failed fixture build may be uploaded.

## GitHub Actions and deployment

`ci.yml` is read-only on push, pull request, and manual dispatch. Both CI and
`pages.yml` call `verify.yml`, which installs the lockfile, audits dependencies,
checks content/types/docs, builds Pagefind, runs Chromium, restores real output,
and verifies the release artifact. Main-branch CI and deployment intentionally
run the same checks independently; the validation steps have one maintained
definition.

`pages.yml` runs on **push to main** or manual dispatch **from main only**.
No PR or other branch deploys. Its build job has only `contents: read`.
Only after all checks succeed can the pinned official upload action package
**`dist` only** with one-day artifact retention. A separate job, depending on
that build, deploys with only `pages: write` and `id-token: write` into the
`github-pages` environment. Pages concurrency is serialized; an active release
is not cancelled, and GitHub keeps the newest pending run.

All external actions are pinned to verified official release commit SHAs.
Checkout, setup-node, and deploy-pages use the supported Node 24 action runtime;
the cookbook itself still runs Node 26.7.0. No action changes repository
visibility, uses private-vault data, uploads the repository, or enables Pages
through an API. Pages is already configured for GitHub Actions.

The owner reviews, commits, pushes, merges, and confirms the successful Pages
run. Recipe-authoring tools must not automatically push or publish.
After deployment, verify the live home page, recipe search, source library,
and sitemap at the site address above.

## Architecture and public URLs

| Path | Responsibility |
| --- | --- |
| `content\recipes\*.md` | Approved recipe metadata and Markdown body |
| `content\sources.json` | External reference cards; no recipe instructions or nutrition |
| `src\lib\recipe-contract.ts` | Shared runtime recipe schema and URL/text rules |
| `src\lib\sources.ts` | Strict source schema, validation, and published-only listing |
| `src\lib\publication.ts` | Central publication predicate, recipe selection, ordering, URLs, filters |
| `src\lib\site.ts` | Public origin/base, canonical URLs, sitemap and robots serialization |
| `src\content.config.ts` | Astro recipe loader; drafts never enter its content store |
| `src\pages\[slug].astro` | Hosted recipe routes |
| `src\pages\sources.astro` | Clearly labeled external source library |
| `src\lib\verify-output.ts` | Final real-content artifact verification |

Canonical recipe paths are `/recipes/<slug>/`, never
`/recipes/recipes/<slug>/`. Recently added recipes use publication dates when
present, then modified/created dates with a stable title tie-break.
The sitemap contains only the home page, source-library page, and published
recipe pages. Drafts, individual source-card targets, fixtures in release
output, and 404 are excluded. No feed is generated.

`/recipes/robots.txt` points to `/recipes/sitemap.xml`. Crawlers discover
robots policy at the origin root, so this project-scoped file does **not**
replace or control `https://ebmarquez.github.io/robots.txt`. The cookbook does
not modify the account site's configuration. The 404 page remains `noindex`;
other public pages have canonical and Open Graph text metadata without
invented images.

There is no CMS, remote imagery/font loading, analytics, recipe JSON-LD,
auto-scaling, ratings, accounts, or comments.
See [Authoring recipes and sources](docs/authoring.md).
