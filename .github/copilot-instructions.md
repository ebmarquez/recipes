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
- This repository initially contains a private local pilot. Inclusion in a
  generated site does not mean a public release has been approved.

## Recipes

- Save to `content\recipes\<stable-slug>.md` using the recipe template.
- Use the content schema as the source of truth for metadata.
- Preserve quantities, method, source attribution, yield ranges, and null times.
- Never invent precise nutrition, testing results, ratings, or author credentials.
- Use standard Markdown recipe links rather than wikilinks.
- Side recommendations should reuse existing recipes; new side pages are opt-in.
- Do not copy protected prose or photographs without appropriate rights.
- New recipes start as drafts and require owner publication review.

## Changes and Verification

- Make surgical changes and preserve unrelated work.
- Run content checks, type checks, Markdown linting, and the build before a
  completion claim. Run browser tests for UI or navigation changes.
- Use a lockfile and the repository's existing scripts.
- Surface errors with file/field context; never hide invalid content with
  silent defaults.
- Do not add an auto-publishing or auto-push workflow to an authoring skill.
- Do not include private content in CI artifacts or build outputs.
