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
- Horizontal local navigation uses one shared rule. Only the active item has its own indicator;
  inherit its color from the active text and layer it directly over the shared rule.
- Keep entity subpages nested beneath one persistent entity route shell so changing a horizontal
  navigation view does not remount shared data, headers, or context.
- Competition pages use horizontal local navigation for Overview, Fixtures, and Teams. Overview is
  the current-season snapshot, Fixtures browses the complete cached date window without truncating
  it, and Teams combines standings with fixture participants when a table is unavailable. Offer the
  current and previous seasons in a compact URL-backed selector; keep standings and fixture windows
  season-scoped, and keep the selected season when changing competition views or opening a fixture.
- Team pages use horizontal local navigation beneath the team header and above their competition
  context. Keep Overview, Fixtures, and Squad there, and extend that menu when more team views are
  added. Make the active item prominent with the shared active-indicator treatment.
- Keep competition and venue context cards plus compact upcoming and recent fixture snapshots on
  the team Overview. Fixtures browses the complete cached date window across competitions. Squad
  uses the full content width.
- On the team Fixtures page, the visible date is the first day of the fixture window. Do not expose
  a hidden midpoint as the navigation date. Keep Overview centered on recent and upcoming fixtures.
- Competition and team Stats are season-scoped entity views. Fetch league totals and team
  performance separately, cache each query locally, preserve the selected season when moving from
  a competition to a team, and request only the statistic types shown in the UI.
- Fixture pages keep Preview, Timeline, Lineups, Stats, and Odds in horizontal navigation inside
  the score hero. Preview stacks the compact venue card directly below Details.
- Fixture Preview pairs that supporting column with season table context, each team’s five most
  recent completed matches before kickoff, and recent head-to-head meetings. Reuse standings and
  team-fixture caches, cache head-to-head separately, and prefetch Preview on intent.
- Sportmonks fixture detail owns events, statistics, and lineups; fixture list refreshes must
  preserve that richer cached detail. Fetch and cache the much larger odds payload only when the
  Odds view opens.
- Keep provider rate limits distinct from connectivity. Show a persistent compact status beside
  Online in the sidebar, retain cached data, and remove the status automatically when the limit
  resets. Use Sportmonks' exact reset time when supplied; otherwise say it will be available within
  an hour rather than inventing a timestamp.
- Treat Sportmonks states 2, 6, 9, and 22 as live. Show a reduced-motion-safe live indicator and
  refresh live fixture data every 30 seconds.
- Present squads as position-grouped player profile cards with rounded portraits and only essential
  identity and football data rather than a dense table or list.
- Keep low-resolution provider imagery in compact supporting cards. Do not stretch it into hero
  treatment that exposes its limitations.
- Matchday fixture rows use one centered status column: a short terminal state such as FT, a green
  live ping beside the match minute or phase, or the scheduled kickoff time. Do not repeat the
  state in a separate badge. The fixture hero may pair its live ping with a visible status label.
- Derive live match time from Sportmonks periods rather than elapsed wall-clock time.
- Fixture timelines include the event player relationship so player portraits can accompany events.
- Fetch fixture odds lazily from the dedicated pre-match endpoint. Its response is a single,
  non-paginated payload even when other Sportmonks collections paginate.
- Do not infer player appearances from team fixtures or bench selection. Name lineup data for what
  it confirms, and reserve appearances for verified participation.
- Refresh fixture pages through the fixture-by-ID endpoint. When fixture lists update shared cache
  records, preserve richer match context already fetched for the entity page.
- Show every active subscribed competition in the sidebar when there are 10 or fewer. Above 10,
  show only locally pinned competitions.
- Global entity search opens from a standard navigation row immediately above Settings or with
  Command-K. Do not style the trigger like an input. Show cached Dexie results immediately, then
  search Sportmonks through main and hydrate the existing entity tables. Keep the palette opaque
  and free of open and close animation. Until a query is entered, show only the search row without
  a divider or reserved results area.
- Keep navigation prefetch non-blocking and stale-aware. TanStack Router preloads routes on intent;
  data intent should warm the existing Dexie queries without bypassing their TTLs. After startup,
  warm today’s Matchday and each visible sidebar competition in the background, one competition at
  a time, so likely destinations are ready without flooding Sportmonks. Prefetch fixture, team,
  squad, player, and venue detail on keyboard focus or deliberate hover; cancel incidental hovers,
  and keep fixture Odds lazy until that view opens.

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
