# Authoring recipes

## Review before adding content

Only approved, public-safe content belongs in this fresh private pilot repository.
Do not copy private notes or repository history here. Review source provenance,
rights, personal information, food safety, and recipe accuracy with the owner.
Attribution is not permission; an absent source does not establish ownership.
Source review and licensing/visibility approval remain mandatory before phase 4.

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
| `date_published` | Optional or `null`; only a genuine publication date |
| `source_name` | Required for `published`; optional for `draft` until known; never invent provenance |
| `source_url` | Optional or `null`; absolute HTTP(S) URL without credentials |

Unknown keys, duplicate YAML keys, invalid values, duplicate/colliding slugs, and
inconsistent filenames fail validation. Reserved slugs include `index`, `404`,
`recipes`, `search`, `pagefind`, `sitemap`, `robots`, `assets`, and `favicon`.
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
Checking ingredients is temporary browser state, not a saved shopping list.
Numbered directions and source-supported nutrition estimate tables render normally.
Nutrition values must remain clearly labeled estimates. Do not add unsupported
values, ratings, fictitious credentials, or duplicate ingredient data for JSON-LD.
The pilot intentionally emits no recipe JSON-LD.

Raw HTML, wikilinks, and images are rejected by this pilot contract. A future image
feature needs reviewed licensing, local assets, alt text, and credit support.

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
The default route is `/recipes/<slug>/`. Keep slugs stable after real publication.
A typo pointing to an unknown recipe fails the build with a file/link error.
A link to an existing `draft` becomes plain display text, without its draft URL.
An unmigrated recipe should be ordinary text, not a pretend link.

## Drafts and local inclusion

Start from `.github\skills\home-athlete-cooking\templates\recipe-template.md`.
Copy it to a new filename and set a matching new `slug`. It defaults to `draft`
and deliberately omits `source_name`; an unknown source must not be filled with
an assumption of originality. This is a valid draft, but changing it to
`published` without a known source credit fails validation.
Replace all placeholders and the example creation/modification dates before
saving a real recipe for review. Keep `date_published: null` until actual publication.

A new valid draft requires no site-code change. Drafts are validated but excluded
before Astro stores content. They are not in routes, home-page data, filter choices,
search, or downloadable static payloads. No sitemap or feed is emitted in this
private, `noindex` pilot.
Contract tests read the actual parent-owned template; the browser build uses a
template-derived draft to verify that it remains outside generated output.

`published` means included in a generated **private local build**. It does not
authorize public source visibility, a deployment, or phase 4. Leave
`date_published` absent or null until genuine publication. "Recently added" uses
modified/created dates when no publication date exists.

Draft status is never a privacy mechanism for a public Git repository. Keep truly
private material out of source files, branches, PRs, and Git history.

## Preview and verify

```powershell
npm run test:content
npm run check
npm run build
npm run preview
```

Read the actual page at <http://127.0.0.1:4321/recipes/>. Verify ingredients,
directions, yield, source credit, links, mobile layout, and browser print output.
Use `npm run test:e2e` for automated Chromium checks. Search uses the built
Pagefind index; `npm run dev` is for authoring and does not generate that index.
Run Markdown linting on any documents you change.

Only the owner may approve release, licensing, deployment, and visibility changes.
