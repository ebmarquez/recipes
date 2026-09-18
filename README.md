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
recipes. Full recipe pages may also contain independently written adaptations
based on factual ingredient quantities and cooking procedures, with honest
source credit and a public source link when known. Protected article prose,
distinctive recipe wording, quotations, and photos are not copied without
appropriate rights. The owner confirms rights to the photos they supply.
The source library links to original creators and to hosted adaptations when
available; an attribution is not a claim of testing or endorsement.

`publication_status: published` includes an owner-approved entry in the public
build. New recipes and source references still start as `draft`; future
publication needs owner review. A successful Pages deployment, not a metadata
change or this README, confirms that a release is live.
Published recipes record their release date, confirmed against the successful
deployment.

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
| `npm run dev` | Local authoring at `/recipes/`, with change watching and development-only blog draft previews |
| `npm run test:content` | Contract, link, source, publication, workflow, and template tests; validate current content |
| `npm run check` | Astro and TypeScript diagnostics |
| `npm run lint:docs` | Lint README, both root agent guides, docs, and all `.github` Markdown |
| `npm run build` | Validate content, generate static HTML/crawler files, and build Pagefind |
| `npm run preview` | Serve `dist` locally with working search |
| `npm run photo:add -- "path\to\photo.jpg" dinner.webp` | Import an orientation-corrected, metadata-free WebP without publishing |
| `npm run test:e2e` | Browser tests against an isolated fixture build, followed by a real-content rebuild |
| `npm run verify:output` | Verify the clean deployment output against the current published collection |

Search needs the generated Pagefind index: use **build + preview**, not `dev`.
The home page searches full hosted recipes and keeps ingredient/time filters
recipe-only. **Search** in the navigation searches both recipes and blog posts;
external source cards stay outside Pagefind. Without JavaScript, all published
recipes and posts, source links, ingredient checkboxes, jump links, and browser
printing remain available.

## Kitchen blog and authoring agents

The **Blog** navigation and the home page's **Read the blog** button open
`/recipes/blog/`. Published posts appear newest first on the blog index and
link to an optional featured recipe. The home page stays focused on recipes,
without blog post previews. Only owner-approved posts appear on the public site.

Start a public-safe draft in `content\blog` using
[`docs\blog-template.md`](docs/blog-template.md). The strict metadata and link
contract is documented in [Kitchen blog authoring](docs/authoring.md#kitchen-blog).
Drafts use `date_published: null` and are excluded from generated output, but
draft source files in this public repository are **not private**.

To review a draft with its photos, run `npm run dev` and choose **Local drafts**
in the navigation at `/recipes/local-drafts/`. These routes exist only in the
loopback development server; builds and `npm run preview` remain published-only.
See [Preview and verify](docs/authoring.md#preview-and-verify) for the workflow.

Four repository agents support the workflow: **Meal-to-Post Planner** proposes
topics and approved public-safe prompts, **Sous-Chef Chronicler** drafts prose
from the owner's observations, and **The Publisher's Editor** reviews facts,
links, privacy, and release checks. **Riley Cookbook Story Editor** helps with
voice, factual storytelling, captions, and alt text. Select them in Copilot's
agent picker.
None publishes, commits, pushes, or schedules deployments. Personal meal plans
and private schedules stay out of repository files.

### Photos on recipes and posts

Import your photo with `npm run photo:add`, then attach it through the optional
`photos` frontmatter list with a local filename, alt text, credit, and an optional
caption. See [Adding photos](docs/authoring.md#adding-photos) for the full example.
Your supplied photos count as your confirmation of rights, not an instruction
to publish. The importer strips embedded metadata and leaves the original alone.

Photos live under `content\photos`, not `public`. Only photos referenced by
published entries are generated; draft-only photos remain out of the public
build. Like draft Markdown, photos committed to this public repository are
still publicly readable in Git.

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
in this checkout and adds synthetic recipes, blog posts, and source cards there.
It never edits `content\recipes`, `content\blog`, or `content\sources.json`.
Synthetic cases cover unknown,
zero, exact-30, and over-30-minute timing, cuisine/category variety, numbered step
headings, template-derived recipe/blog drafts, unpublished source references,
blog chronology, featured recipes, cross-content search, and published versus
draft/unreferenced photo assets.
The tests derive real recipe/blog/source counts from the collections, not a pilot list.

Only test builds receive the internal `COOKBOOK_TEST_CONTENT_DIR` override.
Do not set it for authoring or release builds. Staged content is removed after
building; the suite scans all generated files, including compressed Pagefind
data, for draft sentinels. Teardown rebuilds from real content and verifies that
no fixtures remain. Release verification refuses test overrides and rejects
unexpected HTML pages, fixture markers, missing publication dates, and incorrect
canonicals, sitemap entries, listing counts, or Pagefind recipe/post counts.

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
run. Recipe and blog authoring tools must not automatically push or publish.
After deployment, verify the live home page, blog, recipe and site search,
source library, and sitemap at the site address above.

## Architecture and public URLs

| Path | Responsibility |
| --- | --- |
| `content\recipes\*.md` | Approved recipe metadata and Markdown body |
| `content\blog\*.md` | Public-safe kitchen posts; new entries remain drafts |
| `content\photos\*.webp` | Imported metadata-free photos; only published references are emitted |
| `content\sources.json` | External reference cards; no recipe instructions or nutrition |
| `src\lib\recipe-contract.ts` | Shared runtime recipe schema and URL/text rules |
| `src\lib\blog.ts` | Strict blog schema, featured-recipe validation, reading and ordering |
| `src\lib\photo-contract.ts`, `src\lib\photos.ts` | Photo metadata, import, file checks, and published-only selection |
| `src\lib\sources.ts` | Strict source schema, validation, and published-only listing |
| `src\lib\publication.ts` | Central publication predicate, recipe selection, ordering, URLs, filters |
| `src\lib\site.ts` | Public origin/base, canonical URLs, sitemap and robots serialization |
| `src\content.config.ts` | Astro recipe and blog loaders; drafts never enter their content stores |
| `src\pages\[slug].astro` | Hosted recipe routes |
| `src\pages\sources.astro` | Clearly labeled external source library |
| `src\pages\blog` | Blog index and published post routes |
| `src\pages\search.astro` | Site-wide recipe and blog search |
| `src\pages\photos\[filename].webp.ts` | Static photo endpoints selected from published entries |
| `src\preview` | Blog draft and photo routes injected only into the development server |
| `.github\agents` | Cooking, blog drafting, editorial review, and topic planning agents |
| `src\lib\verify-output.ts` | Final real-content artifact verification |

Canonical recipe paths are `/recipes/<slug>/`, never
`/recipes/recipes/<slug>/`. Recently added recipes use publication dates when
present, then modified/created dates with a stable title tie-break.
Blog paths are `/recipes/blog/<slug>/`, with newest publication dates first
and slug tie-breaks. The sitemap contains the home, source library, blog index,
site search, and published recipe/post pages. Drafts, individual source-card
targets, fixtures in release output, and 404 are excluded. No feed is generated.

`/recipes/robots.txt` points to `/recipes/sitemap.xml`. Crawlers discover
robots policy at the origin root, so this project-scoped file does **not**
replace or control `https://ebmarquez.github.io/robots.txt`. The cookbook does
not modify the account site's configuration. The 404 page remains `noindex`;
other public pages have canonical and Open Graph text metadata without
invented images.

There is no CMS, remote imagery/font loading, analytics, recipe JSON-LD,
auto-scaling, ratings, accounts, or comments.
See [Authoring recipes and sources](docs/authoring.md).
