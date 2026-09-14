---
name: home-athlete-cooking
description: >
  Create and adapt practical home recipes, budget-conscious meals, grocery
  lists, and general training-fuel guidance. Preserve recipe consistency,
  provenance, food safety, and the cookbook's publication boundary.
---

# Home Athlete Cooking

## Scope

Use for recipe creation/adaptation, cooking techniques, substitutions, meal
planning, batch preparation, grocery lists, and general food-first training
nutrition. This skill is self-contained and has no external-vault dependency.

For saved recipes, read `docs\authoring.md` and use
`templates\recipe-template.md`. For conversational meal plans, use
`templates\meal-plan-template.md` as an outline.

## Intake

Use the request's existing constraints. When absent, default to four servings,
ordinary home equipment, common US grocery ingredients, and balanced meals.
Do not assume a restrictive diet.

Clarify allergies, medical restrictions, or missing constraints when they
materially affect safety or feasibility. Do not access calendars or private
family records to infer training schedules.

## Recipe Workflow

1. Identify the dish, occasion, yield, available equipment, and time budget.
2. Pick a simple technique and explain the important doneness cues.
3. List ingredients with exact amounts and preparation states.
4. Write numbered directions with heat levels, timing, equipment, and safety
   temperatures where relevant.
5. Check that every required ingredient appears in the method and vice versa.
6. Include realistic substitutions, budget notes, storage, and reheating.
7. Add estimated nutrition only when supportable, clearly labeled.
8. Search the existing collection for useful sides. Link them without creating
   new side recipes unless the owner explicitly wants those additions.
9. Run the repository checks and report any remaining issues.

## Saved Content Contract

- Location: `content\recipes\<stable-slug>.md`.
- Filename and `slug` match, using lowercase ASCII words separated by hyphens.
- Display titles can contain Unicode and punctuation.
- Use YAML metadata for categorization; do not duplicate it in multiple tables.
- Keep `yield` as human-readable text, including ranges or loaf/jar quantities.
- Numeric `prep_minutes`, `cook_minutes`, `total_minutes`, and `servings` can be
  null when a responsible value cannot be established. Null is never zero.
- Zero cooking minutes is valid for an uncooked recipe.
- Use the difficulty vocabulary in the content schema.
- Preserve original creation dates; update modification dates only for changes.
- Leave `date_published` null until the owner actually publishes the recipe.
- Start new entries as `publication_status: draft`.
- Use only supported metadata fields and valid URLs; run the validator rather
  than assuming the template is complete.

The page layout supplies the recipe title. Start the body with a short
description, followed by ingredients, instructions, notes, and storage.
Group ingredients by component when useful.

Use standard relative Markdown recipe links, for example
`[Calabacitas](../calabacitas/)`. Do not use Obsidian wikilinks.
Do not create links to recipes that do not exist. An unpublished recipe should
not expose a public URL; follow the site's handling of known draft targets.

## Publication and Provenance

Original writing, licensed material, and source-link summaries are different
content types. Preserve attribution, but never treat attribution as permission
to republish protected wording or photographs.

Record known source names and public source URLs. Do not copy chat-share
links, private document links, internal paths, or personal notes into a recipe.
Missing source metadata does not prove originality.

Do not claim a recipe has been physically tested unless the owner supplies
that information. Credit AI assistance honestly without claiming real chef
credentials.

A draft flag only controls site output. It does not hide files in a public
repository, pull request, or Git history. Keep private and rights-unclear notes
outside this repository even during draft work.

No automatic Git push, deployment, visibility change, or publication occurs
as part of this skill. Owner review is a separate step.

## Food Safety

- Prevent cross-contamination between raw and ready-to-eat foods.
- Use safe internal temperatures when relevant.
- Give cooling, refrigeration, freezing, thawing, and reheating guidance.
- Do not treat smell or appearance as proof of safe storage.
- Check labels and cross-contact risks for allergies and substitutions.
- For canning or other preservation, use a tested authoritative process; do
  not invent processing times or assume an altered recipe is shelf-stable.

## Nutrition Boundaries

Support adequate energy, protein, carbohydrates, fats, produce, and hydration.
Adjust general meal advice to the stated activity, not an inferred schedule.
Estimated values depend on actual ingredients, brands, weights, and yield.

Refer therapeutic diets, severe allergies, growth concerns, and medical
conditions to a qualified clinician or registered dietitian. For youth,
prioritize growth and a healthy relationship with food, not restriction.

## Meal Planning

1. Use only schedule information the owner provides.
2. Choose meals that reuse ingredients without excessive repetition.
3. Include practical batch cooking and a fast backup meal.
4. Consolidate groceries by store section.
5. Include preparation, leftover use, cooling, and reheating guidance.

Keep personal meal plans conversational or in an explicitly approved private
location. Do not commit family schedules, medical restrictions, or private
preferences to the cookbook repository.

## Validation

Run `npm run test:content`, `npm run check`, and `npm run build` after saved
recipe changes, plus the Markdown lint command documented in the repository.
For layout/navigation changes, run `npm run test:e2e`.

Check all changed recipe links and any newly introduced ingredients against
the method. Report validation failures explicitly; do not replace unknowns
with fabricated defaults to make a build pass.
