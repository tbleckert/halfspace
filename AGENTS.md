# Halfspace

Halfspace is an open-source, local-first football workbench. Users bring their own Sportmonks
token; browsing cached football data should feel instant.

Stack: Electron/electron-vite, React + TypeScript, shadcn/ui + Tailwind, TanStack Router, and
Dexie/IndexedDB.

## Maintaining these instructions

- Record only clear, enduring directions that apply across the product or a substantial subsystem.
  A routine feature change or design tweak is not a reason to update `AGENTS.md`.
- Keep individual page layouts, control styling, exact values and copy, endpoint recipes,
  implementation checklists, feature status, and session notes out of this file.
- Read [the design guide](docs/design.md) before changing UI. Update it when a change establishes
  a reusable visual convention worth preserving. Update this file only if the broad direction
  itself changes; do not mirror each design-guide edit here.
- Keep feature scope and progress in the relevant milestone or inventory. Use code and tests for
  implementation behavior, and focused documentation when additional explanation is useful.
  Link to those references instead of duplicating their details here.
- Keep personal discussions, account details, local machine paths, and credentials out of tracked
  documentation. Use repository-relative links and public project references.

## Product direction

- Follow the [macOS alpha milestone](docs/macos-alpha.md) for current priorities and acceptance
  criteria, and [the release guide](docs/macos-release.md) for packaging. Tester builds require
  Developer ID signing and notarization; unsigned packages are for local checks.
- Complete Sportmonks Football API coverage is the long-term goal. Choose near-term work around
  useful football journeys and observed user needs. Build entity depth and natural links between
  football entities before speculative tools or infrastructure.
- Keep the README product-first and its roadmap a major-feature checklist. Distinguish implemented
  features from planned work; track endpoint and include detail in the coverage catalog.

## Design direction

- Build an airy editorial football identity around coral and violet, supported by white, warm
  neutrals, and dark ink. Treat shadcn/ui as a component foundation; preserve Halfspace's identity.
- Keep the shell quiet and data surfaces calm. Use softly filled cards, clear typography, spacing,
  and alignment for hierarchy, with selective color for navigation, graphics, and meaningful state.
  Reuse the shared components, semantic tokens, and canonical brand assets.
- Use monospaced tabular typography for compact football facts. Keep names, headings, labels, and
  prose in the regular interface font. Retain semantic colors where they communicate football states.
- Use direct headings and purposeful copy. Avoid redundant guidance, prototype explanations, and
  implementation details that do not help users make a decision.
- Preserve keyboard access, clear focus, readable contrast, and reduced-motion support. Adapt
  content to its available width. Keep motion purposeful and scoped; do not extend local experiments
  across the app automatically.
- Keep entity navigation inside persistent route shells. Preserve meaningful selections and
  originating context in the URL; explicit user choices take precedence over automatic defaults.
- Show loading, empty, unavailable, offline, and error states accurately. Retain usable cached
  content during refresh and make progress truthful.

## Architecture and cache integrity

- Keep Electron thin. Secrets and provider requests live in main, cached football data lives in
  the renderer, and preload exposes narrow typed APIs. Use secure storage for credentials.
- Reuse shared normalized entity caches and focused, typed queries. Keep query membership,
  subscription membership, and detail freshness separate from entity identity. Avoid duplicate caches.
- Preserve richer and newer data when sparse search, list, or included records update an identity.
  Honor explicit removals, and prevent late responses from rolling newer records back.
- Read existing records and merge or remove cached data inside the same write transaction.
- Scope queries, loading states, errors, and refresh responses to their full identity and request.
  Retain data during same-query updates, but never show a previous entity, season, or date under
  a new query. Reject responses for another identity instead of silently substituting data.
- Keep current membership and availability separate from historical records. Cache distinct data
  scopes independently, including historical snapshots and forecasts.
- Keep user preferences and versioned saved content separate from disposable football caches so
  they survive cache clearing and credential replacement.
- Credential changes invalidate pending work and reset football caches before the workspace
  reopens. Surface reset failures and ignore late results from abandoned requests.
- Keep authentication, timeouts, response parsing, and rate-limit backoff in the shared main-process
  provider client. Keep access, rate limiting, and connectivity failures distinct.
- Fetch only what the interface uses. Keep expensive detail lazy, and make prefetch non-blocking
  and stale-aware. Reuse query lifetimes and request deduplication instead of bypassing them.
- Pause automatic refresh while hidden or offline. Refresh overdue data on return without
  overlapping requests; refresh ongoing matches while relevant and stop when they finish.
- Treat today as changing calendar state in the user's time zone. Use reported football timing
  and state rather than inventing match clocks from elapsed wall time.

## Football data and coverage

- Preserve provider-reported values, ranks, relationships, units, and scope. Missing values remain
  unknown, not zero. Do not infer current membership, participation, or confirmed outcomes from
  records that do not establish them.
- Keep predictions, rumours, pending changes, and confirmed history distinct. Label generated
  content and forecasts clearly; never let them replace verified football facts.
- Keep comparisons aligned to explicit samples and contexts. Do not mix seasons, periods, clubs,
  feeds, or market definitions silently, or replace unavailable selections with broader totals.
  Display amounts and measurements only when their units are trustworthy.
- Respect each endpoint's actual pagination contract. Never cache a partial response as complete
  or imply that a page, date window, or local cache represents the entire available history.
- Distinguish subscription access, competition or fixture coverage, and empty data. An empty
  response does not establish denied access, and unknown access is not a denial.
- Product coverage requires usable fetching, caching, and presentation. Follow the
  [capability model](docs/sportmonks-capability-model.md), keep coverage declarations current,
  and regenerate the report with `pnpm coverage`. The generated report owns coverage percentages.
- Count equivalent capabilities only with reviewed evidence. Do not add redundant fetching to
  inflate coverage. Keep coverage checks in CI; upstream catalog updates must not imply product
  support or merge automatically.

## Generative Views

- Grow toward a personal football canvas that users can compose, refine, and save. Build on
  usable data and reusable presentation components rather than speculative AI infrastructure.
  Use the [accepted design studies](design/generative-views/README.md) as visual targets.
- Track implemented and planned widgets in [the catalog](src/shared/view-widgets.ts) and
  [the inventory](docs/view-widgets.md), updating both when status changes. Every implemented
  widget must support 1-, 2-, and 3-column presentations. Adapt to actual container width while
  preserving the saved layout preference. Keep planned widgets out of generation and editing.
- Generate versioned, validated definitions from an explicit catalog of supported widgets and
  query parameters. Render trusted components; never execute generated code, queries, arbitrary
  network requests, or IPC commands. Validate identities as well as schema shape.
- AI chooses composition and data bindings. Deterministic application code owns football values,
  calculations, missing-data states, and links. Reject unsupported requests clearly instead of
  fabricating facts or substituting another team, competition, or season.
- Keep AI requests in Electron main and credentials separate from Sportmonks credentials. Connect
  directly to the user's provider. Send only the prompt, relevant definition, and minimum identity
  context needed for composition; never send the Sportmonks token or persist keys in the renderer.
- Keep model schemas compatible with the provider's supported schema format. Verify the serialized
  request boundary as well as response parsing when changing generation contracts.
- Use the same validated definition, editor, undo flow, and save format for manual, starter, and
  generated Views. Opening and using saved Views must not require AI; cached Views work offline.
- Treat generation as a cancellable draft. Stream validated content, preserve the last usable
  definition on failure, ignore abandoned events, and save only complete validated definitions.
  Show actual progress without invented percentages, staged waiting, or fabricated data.

## Engineering and verification

- Write idiomatic, simple, maintainable code. Prefer descriptive names, focused functions,
  straightforward control flow, and existing patterns. Avoid premature abstraction and indirection.
- Fix root causes and remove obsolete or unused code within the change. Handle real external
  failure points without speculative guards around controlled internal inputs.
- Introduce compatibility code only when an existing deployed, external, or non-atomic boundary
  requires it. If all consumers can change together, update them directly. Required compatibility
  paths must explain what they preserve, why they are needed, and when they can be removed.
- Use test-first development for logic-heavy changes where useful. Prioritize core logic, critical
  user flows, and confirmed bugs. Reproduce a regression and confirm the test fails for the right
  reason before fixing it.
- Test behavior rather than incidental classes, private helpers, or internal wiring. Do not add
  regression tests for discussion outcomes, styling tweaks, or speculative behavior.
- Verify visual work in the actual Electron shell. Use visual inspection or snapshots for design
  changes; a browser preview alone does not establish native-shell behavior. Restart Electron when
  verifying main-process changes.
- Await asynchronous refreshes and cache writes before test teardown. A provider call or error
  alone does not establish that related work has finished.
- Run `pnpm typecheck`, `pnpm format`, and `pnpm lint` after JavaScript or TypeScript changes.
  Run relevant tests and other checks required by the changed behavior.
