# Authoring recipes

## Review before adding content

Only approved, public-safe content belongs in this public cookbook repository.
Do not copy private notes or repository history here. Review source provenance,
rights, personal information, food safety, and recipe accuracy with the owner.
Attribution is not permission; an absent source does not establish ownership.
The owner approved public hosting and the editorially reviewed release set,
including uncredited recipes whose rights they confirmed. This approval does
not automatically cover future additions or authorize copying external works.
Full recipe details may be an independently written adaptation of factual
ingredient quantities and cooking procedures, with accurate source attribution.
Do not copy protected prose, distinctive wording, photographs, or quotations,
or closely paraphrase an article. Keep private source URLs out of the site.
Use `source_name` for the known creator or saved attribution and `source_url`
for a genuine public link when available; leave unknown links null.
Label material changes and adaptations without implying source-author
endorsement or physical testing. Hold unresolved quantities and unsafe
preservation processes rather than inventing values.
No additional reuse license is granted, third-party rights remain with their
owners, and no exclusive rights over AI-only output are asserted.

## Metadata contract

Keep one recipe in `content\recipes\<slug>.md`. All schema fields below are
required unless marked optional. Existing metadata is retained, not inferred.
The single schema in `src\lib\recipe-contract.ts` is used by Astro and Node tests.

| Fields | Rules |
| --- | --- |
| `title`, `description` | Nonempty plain text; unique title, normalized for case/spacing |
| `type` | Exactly `Recipe` |
| `slug` | Lowercase ASCII words/numbers separated by hyphens; matches filename |
| `publication_status` | Exactly `draft` or `published` |
| `cuisine`, `category`, `meal_type` | Nonempty text; use consistent existing vocabulary |
| `tags`, `main_ingredients` | Nonempty lists of nonempty strings |
| `dietary` | List of strings; empty is allowed; not an allergen guarantee |
| `difficulty` | `Easy`, `Medium`, or `Hard`; review/map other labels explicitly |
| `prep_time`, `cook_time`, `total_time` | Human-readable strings; retain ranges and uncertainty |
| `prep_minutes`, `cook_minutes`, `total_minutes` | Nonnegative finite numbers or `null` |
| `yield` | Human-readable yield, including ranges such as `4-5 servings` |
| `servings` | Positive integer or `null`; not a scaling promise |
| `key_technique` | Nonempty text |
| `special_notes` | String; may be empty |
| `date_created`, `date_modified` | Valid `YYYY-MM-DD` calendar dates |
| `date_published` | Optional/null while drafting; owner-approved release date required for deployment |
| `source_name` | Required for `published`; optional for `draft` until known; never invent provenance |
| `source_url` | Optional or `null`; absolute HTTP(S) URL without credentials |
| `photos` | Optional list of imported local photos with alt text and credit; see Adding photos |

Unknown keys, duplicate YAML keys, invalid values, duplicate/colliding slugs, and
inconsistent filenames fail validation. Reserved slugs include `index`, `404`,
`recipes`, `blog`, `photos`, `search`, `sources`, `local-drafts`, `pagefind`,
`sitemap`, `robots`, `assets`, and `favicon`.
Dates stay date-only strings; they are not converted into fabricated publication
timestamps.

Do not replace unknown numeric times with zero. Zero is a known time, such as a
no-cook side dish. The 30-minute filter excludes `null` and values above 30.
Human-readable times and yields display unchanged. There is no auto-scaling.

## Markdown body

Use level-two sections. Include:

1. `## Ingredients`, with a bullet list. Level-three ingredient groups are supported.
2. `## Instructions` or `## Directions`, with a numbered list, or sequential
   `### Step 1: Title` headings followed by explanatory paragraphs.
3. Appropriate doneness, safety, variations, storage, and related recipe notes
   when supported by the reviewed recipe.

Ingredients are the sole source of truth. The renderer adds large labeled
checkboxes only within the Ingredients section. Markdown task markers in shopping
or other lists render as ordinary bullets, not additional checkbox controls.
Pagefind skips native label text, so the renderer derives an indexing attribute
from the same Markdown ingredient. Do not maintain a second authored ingredient list.
Checking ingredients is temporary browser state, not a saved shopping list.
Numbered directions and source-supported nutrition estimate tables render normally.
Nutrition values must remain clearly labeled estimates. Do not add unsupported
values, ratings, fictitious credentials, or duplicate ingredient data for JSON-LD.
The site intentionally emits no recipe JSON-LD.

Raw HTML, wikilinks, and inline Markdown images are rejected. Attach supported
local photographs through the `photos` metadata described under Adding photos.

## Links and stable URLs

Use canonical relative recipe links, not vault paths or `.md` filenames:

```markdown
[Calabacitas](../calabacitas/)
[Ingredients](../calabacitas/#ingredients)
[Jump to directions](#directions)
```

`Instructions` and `Directions` both receive the stable `directions` anchor.
Other headings use lowercase GitHub-style heading IDs. Validation verifies
fragments as well as recipe targets. Reference-style Markdown links also work.
Body headings cannot replace the page title or shadow the page's own controls;
`main` and `print-recipe` heading IDs receive a numeric suffix.
External links accept HTTP(S) only; protocol-relative URLs, credentials, control
characters, unsafe schemes, traversal paths, and malformed URLs fail validation.

The renderer adds Astro's configured base to published recipe links.
The custom-domain route is `/<slug>/`. Keep slugs stable after real publication.
A typo pointing to an unknown recipe fails the build with a file/link error.
A link to an existing `draft` becomes plain display text, without its draft URL.
An unmigrated recipe should be ordinary text, not a pretend link.

## Drafts and public inclusion

Start from `.github\skills\home-athlete-cooking\templates\recipe-template.md`.
Copy it to a new filename and set a matching new `slug`. It defaults to `draft`
and deliberately omits `source_name`; an unknown source must not be filled with
an assumption of originality. This is a valid draft, but changing it to
`published` without a known source credit fails validation.
Replace all placeholders and the example creation/modification dates before
saving a real recipe for review. Keep `date_published: null` while drafting.
For an approved release, the owner sets the intended release date and confirms
it after successful deployment. The September 14, 2026 launch uses `2026-09-14`.

A new valid draft requires no site-code change. Drafts are validated but excluded
before Astro stores content. They are not in public routes, home-page data, filter choices,
search, the sitemap, or downloadable static payloads. The public sitemap
contains the home page, source library, blog index, site search, and published
recipe and blog pages only.
No feed is emitted.
Contract tests read the actual parent-owned template; the browser build uses a
template-derived draft to verify that it remains outside generated output.

`published` means included in the generated **public site**. Move an entry to
this status only after owner review of its provenance, privacy, and content.
Deployment verification requires a release date for every published recipe.
The schema still accepts null dates while preparing content; a release with
missing dates cannot pass the deployment gate.

Draft status is never a privacy mechanism for a public Git repository. Keep truly
private material out of source files, branches, PRs, and Git history.

## External source library

Keep links to original works in `content\sources.json`; these cards themselves
do not contain copied recipe bodies. A separately reviewed, independently
written adaptation belongs in `content\recipes`. If its slug matches a source
card, the library also offers a link to the full adaptation.
Each entry has exactly these fields:

| Field | Contract |
| --- | --- |
| `slug` | Unique lowercase ASCII identifier with hyphen-separated words |
| `title`, `description` | Nonempty plain text; concise original descriptions, not copied instructions |
| `source_name` | Honest creator/publication attribution; do not invent an unknown creator |
| `source_url` | Safe absolute public HTTP(S) URL; no credentials or private/share links |
| `cuisine`, `category` | Nonempty plain text using consistent vocabulary |
| `publication_status` | `draft` by default; `published` only after owner approval |

Unknown fields, duplicate slugs, unsafe URLs, and HTML in text fail validation.
Do not add recipe bodies, ingredients, nutrition, ratings, or local cookable
recipe metadata to source cards. The source library identifies every entry as
an external reference and directs readers to the creator's recipe or guide.
It is separate from hosted recipe counts, filters, and Pagefind search.
Draft source entries are excluded before rendering or serialization.
A source entry alone does not generate an individual recipe page. A matching
published recipe generates its own page and retains its source credit.

Recipe Markdown may link directly to a reviewed public external source URL.
Unknown or unmigrated recipe targets remain plain text; do not create a broken
local link or copy protected wording to fill the gap.

## Owner-approved release

Blog authoring follows the same owner-review boundary. Building blog support
does not approve any particular post, planned meal, or release date.

Authoring a recipe does not commit, push, merge, or deploy it. After reviewing
the changes and setting publication metadata, the owner integrates the release.
Pushing approved changes to `main` runs the Pages workflow; manual dispatch is
also restricted to `main`. Pull requests and other branches do not deploy.
The build must pass content checks, type checks, documentation lint, browser
tests, and clean-output verification before uploading only `dist`.
The owner confirms the successful deployment and actual release date.

## Preview and verify

```powershell
npm run test:content
npm run check
npm run lint:docs
npm run build
npm run test:e2e
npm run verify:output
npm run preview
```

Read the actual page at <http://127.0.0.1:4321/>. Verify ingredients,
directions, yield, source credit, links, mobile layout, and browser print output.
Use `npm run test:e2e` for automated Chromium checks. Search uses the built
Pagefind index; `npm run dev` is for authoring and does not generate that index.
To review a blog draft with its photos, stop the preview server and run:

```powershell
npm run dev -- --host 127.0.0.1 --port 4321
```

Choose **Local drafts** in the navigation, or open
<http://127.0.0.1:4321/local-drafts/>.
Draft pages use the same article and photo layout as published posts, with a
clear draft banner. Refresh after editing a post. Featured recipes link only
when published; draft targets remain plain text. Keep this authoring server
bound to loopback, not a network/public host.

Development routing accepts URLs with or without the final `/`. Draft pages
redirect missing-slash links to the full URL, preserving query parameters;
photo URLs keep their `.webp` filenames. Production still uses
`trailingSlash: 'always'`.

These development-only routes read validated Markdown directly, without
putting drafts into Astro's content store. They and their photo endpoints
generate no production files and are excluded from search and the sitemap.
`npm run build` followed by `npm run preview` still shows published content
only. Viewing a draft does not change its status or authorize publication.

`npm run lint:docs` includes root `AGENTS.md` and `CLAUDE.md`, docs, and all
`.github` authoring Markdown. Lint changed recipe files separately as well.

Only the owner may approve future releases, licensing, deployment configuration,
and visibility changes. Public hosting approval is not a new reuse license.

## Kitchen blog

Store public-safe posts in `content\blog\<stable-slug>.md`, starting from
`docs\blog-template.md`. Replace the sample title, slug, description, dates,
and checklist prompts with owner-supplied material. New posts remain drafts;
do not fabricate a first post or turn planned meals into claimed experiences.
An empty collection displays an invitation to the first approved post.

The strict schema in `src\lib\blog.ts` is shared by validation and Astro.
Every field below is required unless marked optional; unknown fields and
duplicate YAML keys fail.

| Field | Contract |
| --- | --- |
| `title`, `description` | Nonempty plain text; title unique after case/spacing normalization |
| `slug` | Stable lowercase ASCII words/numbers separated by hyphens; matches filename; not `index` |
| `publication_status` | `draft` or `published`; no automatic scheduled publication |
| `date_created`, `date_modified` | Actual authoring dates, valid `YYYY-MM-DD` strings |
| `date_published` | Exactly null for drafts; owner-approved date required for published posts |
| `featured_recipe` | An existing recipe slug, or null; published posts may feature only published recipes |
| `photos` | Optional list of imported local photos with alt text and credit; see Adding photos |

Posts have freeform Markdown bodies. Short dinner stories should flow in
conversational paragraphs, without a heading before each paragraph. Preserve
the owner's phrasing and avoid repeated summaries or formulaic explanations.
Use level-two headings only when longer posts need sections; ingredients and
directions are not required. This does not change recipe formatting.
Raw HTML, inline Markdown images, and wikilinks
remain unsupported; use `photos` metadata for photographs.
Checklist prompts render as ordinary bullets, not recipe ingredient controls.
The recipe remains the method's source of truth; use links rather than copied
instructions. Blog claims must reflect the owner's account, not AI experience.

Blog URLs use the configured base, currently `/blog/<slug>/` on the
custom domain. Within blog Markdown, use:

```markdown
[The recipe](../../korean-beef-lettuce-wraps/)
[Recipe directions](../../korean-beef-lettuce-wraps/#directions)
[Another post](../another-post/)
[This section](#kitchen-notes)
```

Only link actual entries and headings. Validation checks all targets, including
drafts. Draft-target body links become plain display text with no draft URL.
The featured-recipe card uses the existing recipe's title, description, and
timing, rather than separate blog copies. Recipe Markdown keeps its existing
`../recipe-slug/` link contract.

Published posts appear newest publication date first (slug breaks date ties)
on the blog index. The home page links to the blog without displaying post
previews. Posts enter the Pagefind index and sitemap.
`/search/` searches both recipes and posts;
the home page's ingredient/time filters and recipe counts remain recipe-only.
External source cards remain outside Pagefind. Draft posts are validated but
excluded before Astro's content store, production HTML, search, and sitemap
generation. The loopback-only development workflow above can preview them.

**Draft does not mean private.** Do not save private meal plans, schedules,
family locations, medical details, journals, or rights-unclear material here.

### Supporting agents

Choose a repository agent in Copilot's agent picker:

| Agent | Responsibility |
| --- | --- |
| Sous-Chef Chronicler | Turn owner-provided, public-safe cooking notes into original draft prose |
| The Publisher's Editor | Review facts, provenance, privacy, links, and automated checks without publishing |
| Meal-to-Post Planner | Propose meals conversationally; create only approved public-safe draft prompts |
| Riley Cookbook Story Editor | Review the owner's voice, factual impressions, photo captions, and alt text |

Example requests: "Draft a post about this recipe using these observations,"
"Review this draft for publication readiness," or "Suggest three recipe-linked
post topics; don't save my private schedule." Planner does not install timers
or auto-publishing workflows. None of these agents commit, push, or deploy.

For blog changes run the full verification commands above, plus:

```powershell
npm exec --no -- markdownlint "content/blog/*.md"
```

Run that separate lint command when blog Markdown files exist. Browser tests
use synthetic published and draft posts only in their isolated fixture copy.
The output verifier expects exactly published recipe/post routes and Pagefind
entries; neither source files nor fixture output are deployment artifacts.

## Adding photos

Photos are supported on both recipe and blog pages. The owner confirms they
own the rights to the photographs they supply for this site. Accept that
confirmation without repeatedly requesting proof; it does not authorize
copying other people's images or automatically publishing a post.
For any separately sourced photo, resolve permission and truthful credit first.

Import an owner-supplied still JPEG, PNG, or WebP:

```powershell
npm run photo:add -- "C:\path\to\dinner.jpg" dinner.webp
```

The importer applies the original orientation, limits the longest edge to
1600 pixels without enlarging smaller images, converts to WebP, and strips
embedded metadata including EXIF/GPS, XMP, IPTC, and color profiles. It leaves
the original untouched and refuses to overwrite an existing filename. Use
a new stable filename for a replacement. Input limits are 40 MB and 40 million
pixels; animated images and SVG are not supported.

Only the sanitized copy goes into `content\photos`. Never copy the original
into this repository, and never store authoring photos under `public`:
Astro copies public assets even when the referencing post is a draft.

Add this optional frontmatter field to the recipe or post:

```yaml
photos:
  - src: dinner.webp
    alt: Egg drop soup with egg ribbons and sliced green onions in a bowl.
    credit: Photo by the site owner.
    caption: Tonight's soup.
```

`src` is a filename, not a URL or path. Only lowercase ASCII words/numbers
separated by hyphens and ending in `.webp` are allowed. `alt` and `credit`
must be nonempty plain text; `caption` is optional but must be nonempty plain
text when supplied. Unknown fields and duplicate photos within an entry fail.
Use `photos: []` or omit the field when no photos are needed.

The page displays photos in order, with responsive sizing, intrinsic
dimensions, captions, and credit. They work without JavaScript and are excluded
from full-text recipe indexing. The original recipe remains unchanged when
you attach a dinner photo to a blog post.

All referenced files, including draft references, are checked for existence,
decodability, valid dimensions, and stripped metadata. Do not bypass the importer
by renaming a JPEG or adding metadata back to a WebP.

Only photos referenced by published recipes or posts receive a generated URL,
normally `/photos/dinner.webp`. Draft-only and unreferenced photos
are excluded entirely from the build, not merely hidden from the page.
A photo shared with a published entry is public even if a draft also uses it.
The release verifier checks the exact emitted photo list and file bytes.

Draft status still does not make Git files private. Check visible photo
content for private details before saving; metadata stripping cannot remove
information visible in the picture. Image rights confirmation and approval
of draft wording remain separate from an instruction to publish, commit,
push, or deploy.
