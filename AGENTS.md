# Halfspace

Halfspace is an open-source, local-first football workbench. Users bring their own Sportmonks
token; browsing cached football data should feel instant.

Stack: Electron/electron-vite, React + TypeScript, shadcn/ui + Tailwind, TanStack Router, and
Dexie/IndexedDB.

Keep Electron thin: secrets and Sportmonks requests live in main, cached football data lives in
the renderer, and preload exposes only narrow typed APIs. Avoid duplicate caches and premature
abstractions.

## Product Design

- Keep the brand identity vibrant and energetic. Avoid restrained heritage-sports palettes that
  can make the product feel like an American football brand.
- Use `resources/halfspace-logo.svg` as the canonical brand mark. Preserve its flat yellow, blue,
  navy, and white geometry and its legibility down to 16px.
- Required setup states use a focused fullscreen flow before the main app appears.
- Use direct, singular page headings. Do not add eyebrow labels or pretitles above them.
- Avoid prototype copy, implementation explanations, and redundant guidance. Text should name the
  current thing, communicate a meaningful state, or enable an action.
- Build the product outward through dedicated football entity pages and natural links between
  them. Prioritize entity depth before secondary tools or dashboards.
- Team pages use horizontal local navigation beneath the team header and above their competition
  context. Keep Overview and Squad there, and extend that menu when more team views are added. Make
  the active item prominent with a dark underline layered over the shared navigation rule.
- Keep competition and venue context cards on the team Overview. Squad uses the full content width.
- Present squads as position-grouped player profile cards with rounded portraits and only essential
  identity and football data rather than a dense table or list.
- Keep low-resolution provider imagery in compact supporting cards. Do not stretch it into hero
  treatment that exposes its limitations.
- Do not infer player appearances from team fixtures or bench selection. Name lineup data for what
  it confirms, and reserve appearances for verified participation.
- Refresh fixture pages through the fixture-by-ID endpoint. When fixture lists update shared cache
  records, preserve richer match context already fetched for the entity page.
- Show every active subscribed competition in the sidebar when there are 10 or fewer. Above 10,
  show only locally pinned competitions.

## Mindset & Process

- Fix issues from first principles. Do not apply bandaids when the root cause can be identified and
  solved directly.
- Leave no breadcrumbs when moving or deleting code. Remove the old code cleanly.
- Clean up unused code as part of the change.
- Write idiomatic, simple, maintainable code. Prefer the most intuitive solution that fully solves
  the problem.
- If you discover something new, or the user mentions something worth remembering, add it to
  `AGENTS.md`.
- Run `pnpm typecheck`, `pnpm format`, and `pnpm lint` after touching JavaScript or TypeScript files.

## Compatibility Code

- Treat compatibility code as a temporary cost, not a default precaution.
- Only introduce it when an existing deployed, external, or non-atomic boundary requires old and
  new behavior to coexist.
- If we control all consumers and can update them in the same change, do not write a shim; update
  the code directly.
- Never add compatibility layers for speculative needs, undeployed changes, or internal-only
  package transitions.
- Any required compatibility path must state what it preserves, why it is needed, and when it
  should be removed.

## Testing Discipline

- Use the three laws of TDD as a guiding discipline for logic-heavy code, not as a strict rule for
  all development:
  - Write a failing test before writing production code.
  - Do not write more of a test than is sufficient to fail or fail to compile.
  - Do not write more production code than is sufficient to make the currently failing test pass.
- Prioritize tests for:
  - Core business logic
  - Critical user flows
  - Previously broken functionality
- Regression tests are for preventing confirmed bugs from returning.
- For regression tests:
  - Write a test that reproduces the bug.
  - Run it and confirm it fails for the right reason.
  - Fix the bug.
  - Rerun the test and confirm it passes.
- Do not write regression tests for discussion outcomes, design direction changes, or speculative
  behavior that was never a reproduced bug.
- Test behavior, not implementation details.
  - Avoid asserting incidental structure such as class names, private helpers, or internal wiring.
  - For visual design, prefer real visual snapshots over targeted assertions.
