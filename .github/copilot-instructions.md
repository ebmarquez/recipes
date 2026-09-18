# Cookbook Repository Instructions

This standalone cookbook uses Markdown recipes, Astro, and Pagefind.
Read `docs\authoring.md` before editing content and use Chef Mateo's
`home-athlete-cooking` skill for recipe work.

## Scope and Privacy

- Work only in this repository unless the owner explicitly authorizes another
  location. There is no dependency on a personal/work vault.
- Keep private notes, personal meal plans, journals, sessions, credentials,
  and unreviewed third-party material out of Git.
- A draft flag does not make public Git content private.
- Do not change visibility, enable deployment, publish a recipe, commit, or
  push without the applicable owner instruction.
- This repository is public. The owner approved hosting and the reviewed
  release set, including uncredited recipes whose rights they confirmed.
  Future recipe/source publication still requires owner approval.
- Keep original-source links in `content\sources.json`. Full recipes can be
  independently written adaptations of factual ingredient quantities and
  procedures, with truthful source credit and a public link when known.
  Do not copy protected prose, quotations, images, or distinctive wording.
  Do not invent source URLs, testing claims, quantities, or nutrition values.
- Publishing approval grants no additional reuse license. Third-party rights
  remain with their owners; do not claim exclusive rights over AI-only output.
- The owner confirms rights to photos they supply for the site. Accept that
  confirmation without repeatedly asking for proof. Import them with
  `npm run photo:add` to remove embedded metadata; never put originals in
  `public`. Use optional `photos` metadata with alt text and credit on recipes
  or blog posts. Photo rights confirmation does not authorize publication.

## Recipes

- Save to `content\recipes\<stable-slug>.md` using the recipe template.
- Use the content schema as the source of truth for metadata.
- Preserve quantities, method, source attribution, yield ranges, and null times.
- Never invent precise nutrition, testing results, ratings, or author credentials.
- Use standard Markdown recipe links rather than wikilinks.
- Side recommendations should reuse existing recipes; new side pages are opt-in.
- Do not copy protected prose or photographs without appropriate rights.
- New recipes start as drafts and require owner publication review.
- Keep `date_published` null while drafting. For an approved release, use the
  owner-approved release date and confirm it after a successful deployment.
- Source cards have their own strict contract; they are not local recipes and
  do not enter recipe search, recipe counts, or ingredient/time filters.

## Changes and Verification

- Blog posts use `content\blog` and the strict schema in `src\lib\blog.ts`.
  Start from `docs\blog-template.md`; drafts have a null publication date.
  Only owner-approved, public-safe material belongs in drafts. The blog agents
  must not save private meal plans or schedule automatic publication.
  New blog posts require owner review before publication, just like recipes.
  Blog posts enter site search, not recipe counts or ingredient/time filters.

- Make surgical changes and preserve unrelated work.
- Run content checks, type checks, Markdown linting, and the build before a
  completion claim. Run browser tests for UI or navigation changes.
- Use a lockfile and the repository's existing scripts.
- Surface errors with file/field context; never hide invalid content with
  silent defaults.
- Do not add an auto-publishing or auto-push workflow to an authoring skill.
- Do not include private content in CI artifacts or build outputs.
- The existing Pages workflow deploys only verified main-branch builds.
  Recipe creation must not trigger a push or deployment automatically.
- Use `npm run lint:docs` for all authoring guidance, including `AGENTS.md`
  and `CLAUDE.md`; lint changed recipe Markdown separately.
- Run `npm run verify:output` before any deployment artifact upload.
