# Cookbook Agent Guide

Read `.github\copilot-instructions.md` and `docs\authoring.md` before changing
recipes or publishing behavior. Use Chef Mateo's `home-athlete-cooking` skill
for recipe work.

## Public workflow and boundaries

The cookbook repository is public. New recipes and source references default
to drafts and require owner approval before publication. Draft flags do not
hide source files: keep private schedules, journals, personal/work context,
and rights-unclear material outside the repository.

Use `content\sources.json` for link-only external references, not copied
recipe methods. Public hosting approval grants no additional reuse license;
third-party rights remain with their owners. Do not claim exclusive rights
over AI-only output or invent testing, ratings, or chef credentials.

The Pages workflow deploys verified `main` builds. Recipe creation must not
automatically commit, push, publish, or trigger deployment.

## Development

Start the development server with:

```powershell
npm run dev
```

For the fully indexed cookbook preview, run `npm run build` followed by
`npm run preview`. Keep servers session-attached and stop only the process
you started; do not detach them from the CLI session.

Run `npm run test:content`, `npm run check`, `npm run lint:docs`,
`npm run build`, `npm run test:e2e`, and `npm run verify:output` for release
verification. The browser suite uses its own isolated fixture copy; never
upload a fixture build or anything except verified `dist`.

## Documentation

Full documentation: [Astro documentation](https://docs.astro.build)

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using framework components][frameworks]
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

[frameworks]: https://docs.astro.build/en/guides/framework-components/
