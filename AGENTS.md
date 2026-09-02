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
- Treat shadcn/ui as a component foundation, not as Halfspace's visual identity. Build an
  editorial football-workbench language through typography, spacing, match presentation, and
  graphic details derived from the logo. Keep data surfaces calm and concentrate vibrant brand
  color in navigation, section framing, and meaningful state.
- Use monospaced tabular typography as the shared language for compact football facts: scores,
  clocks, event minutes, match states, table values, statistics, odds, shirt numbers, and W/D/L.
  Keep names, headings, labels, positions, and prose in the regular interface font.
- Keep the application shell quiet. The sidebar is only slightly lighter than the content canvas,
  with a subtle white boundary; use muted active-item backgrounds and brand blue for active text
  instead of large areas of solid brand color.
- Keep a dedicated drag region across the empty top strip of the hidden-title-bar window. It must
  remain available in setup states as well as the main workspace; keep interactive controls outside
  it or explicitly mark them as non-draggable.
- Use shadcn/ui's Nova style (`b0`) as the density reference: compact 32px default controls,
  restrained radii, and tighter page and card spacing. Preserve Halfspace's own palette and
  football-specific presentation rather than applying a preset as a wholesale visual reset.
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
  ten most recent seasons in a compact URL-backed selector; keep standings and fixture windows
  season-scoped, and keep the selected season when changing competition views or opening a fixture.
  Changing the selected season must retain the active competition subpage.
- Competition Schedule browses the complete season by stage and round. Fetch the schedule once per
  cache window, normalize its fixtures into the shared cache, and keep stage and round selections
  in the URL. Default to the current stage and round; clear those selections when switching seasons.
  The schedules endpoint is non-paginated and does not accept includes.
  While a schedule contains ongoing matches, shorten its cache window to 30 seconds.
- Team pages use horizontal local navigation beneath the team header and above their competition
  context. Keep Overview, Fixtures, and Squad there, and extend that menu when more team views are
  added. Make the active item prominent with the shared active-indicator treatment.
- Keep competition and venue context cards plus compact upcoming and recent fixture snapshots on
  the team Overview. Fixtures browses the complete cached date window across competitions. Squad
  uses the full content width. Transfers shows the complete team history with player-first rows,
  explicit incoming and outgoing direction, the counterpart club, and direct player and team links.
  Reuse the normalized transfer records shared with Player Career and never show amounts without a
  trustworthy currency.
- On the team Fixtures page, the visible date is the first day of the fixture window. Do not expose
  a hidden midpoint as the navigation date. Keep Overview centered on recent and upcoming fixtures.
- Competition and team Stats are season-scoped entity views. Fetch league totals and team
  performance separately, cache each query locally, preserve the selected season when moving from
  a competition to a team, and request only the statistic types shown in the UI. Use the compact
  URL-backed selector for the ten most recent seasons on both views.
- Competition Stats includes player leaders for goals, assists, yellow cards, and red cards.
  Fetch all pages from the season topscorers endpoint with player, participant, and type includes;
  cache the four categories together per season. Preserve provider ranks and totals, keep card
  types separate, and retain competition and season context in player and team links.
- Competition Overview shows compact Top scorer and Top assists profile cards above Upcoming,
  reusing the season leaderboard cache. Keep portraits circular and totals monospaced; acknowledge
  equal totals as a shared lead even when provider ranks differ. Hide categories without positive
  totals, and link to the matching URL-backed leaderboard category in Stats.
- Fixture pages keep Preview, Timeline, Lineups, Stats, and Odds in horizontal navigation inside
  the score hero. Preview stacks the compact venue card directly below Details.
- Fixture Preview pairs that supporting column with season table context, each team’s five most
  recent completed matches before kickoff, and recent head-to-head meetings. Reuse standings and
  team-fixture caches, cache head-to-head separately, and prefetch Preview on intent.
- Sportmonks fixture detail owns events, statistics, and lineups; fixture list refreshes must
  preserve that richer cached detail. Fetch and cache the much larger odds payload only when the
  Odds view opens.
- Render both complete starting XIs from Sportmonks `formation_field` coordinates on one shared
  horizontal pitch, mirrored from their own goals. Use nested lineup portraits, link every player,
  and annotate goals, assists, cards, missed penalties, and substitutions from fixture events. Keep
  both benches together below the pitch, and fall back to lists when formation data is incomplete.
- Fetch only the lineup-detail statistic types used by the fixture UI. Keep the pitch readable by
  showing only each player's rating there; place minutes and position-relevant performance metrics
  in the Fixture Stats view, grouped by team and linked to the existing player pages.
- Give lineup portraits solid warm-white circular backplates with a subtle shadow rather than
  outline rings. Keep shirt numbers and event annotations offset as separate, smaller markers.
- Keep provider rate limits distinct from connectivity. Show connectivity persistently in the
  upper-right app chrome and place a compact rate-limit status beside it, retain cached data, and
  remove the status automatically when the limit resets. Use Sportmonks' exact reset time when
  supplied; otherwise say it will be available within an hour rather than inventing a timestamp.
- Treat Sportmonks states 2, 6, 9, and 22 as live. Show a reduced-motion-safe live indicator and
  refresh live fixture data every 30 seconds.
- Present squads as position-grouped player profile cards with rounded portraits and only essential
  identity and football data rather than a dense table or list.
- Squad season selection offers the current squad plus the competition's ten most recent seasons.
  Cache historical rosters per team and season without overwriting current squad membership, retain
  season context in player links, and keep the Squad view open when the season changes.
- Team Overview shows current absences from `sidelined.player` and `sidelined.type`, separate from
  the selected historical season. Respect the provider's completed flag, distinguish missing data
  from no reported absences, and never invent return dates or infer availability from season IDs.
  Refresh team detail hourly and retain it when basic search results update team identity.
- Keep low-resolution provider imagery in compact supporting cards. Do not stretch it into hero
  treatment that exposes its limitations.
- Matchday fixture rows use one centered status column: a short terminal state such as FT, a green
  live ping beside the match minute or phase, or the scheduled kickoff time. Do not repeat the
  state in a separate badge. Use monospaced tabular typography for row status, time, minute, and
  score. The fixture hero may pair its live ping with a visible status label.
- Treat “today” as live calendar state rather than a value captured when a module or app shell
  mounts. Refresh it across midnight and when the app regains focus, and use the current day when
  returning to Matchday from a page without date context. Keep the Today action beside the date
  control.
- Matchday competition groups use the shared `Card`, `CardHeader`, and `CardTitle` hierarchy. Keep
  headers on the normal card surface rather than filling them with solid brand color. Use a muted
  outer border and header divider, and link each competition name together with its logo. Use the
  sidebar active-item background for fixture-row hover and separators between rows. Keep header and
  row padding compact. Keep the Matchday heading consistent with the other page headings rather
  than giving it separate oversized brand treatment.
- Treat Matchday as a rolling fixture hub around the selected date. Use a compact seven-day
  Monday-to-Sunday navigator with only a small weekday and a two-digit day in the interface font,
  no fixture counts or container chrome, and place it in the page header between Matchday and the
  date and refresh controls. Put previous- and next-week chevrons on its edges. Distinguish the
  selected day through text emphasis. When the week spans months, mute dates outside the selected
  month slightly. Separate current live fixtures, keep an empty selected day quiet, and surface the
  next three fixture days plus the two latest result days as compact previews linking to the
  complete day. Fetch the wider window in one Sportmonks date-range request, split it into the
  existing daily Dexie queries, and refresh the selected day separately so live updates do not
  refetch the full window.
- Derive live match time from Sportmonks periods rather than elapsed wall-clock time.
- Fixture timelines include the event player relationship so player portraits can accompany events.
  Respect Sportmonks `sort_order` when sequencing events that share a match minute.
- Fetch fixture odds lazily from the dedicated pre-match endpoint. Its response is a single,
  non-paginated payload even when other Sportmonks collections paginate.
- Do not infer player appearances from team fixtures or bench selection. Name lineup data for what
  it confirms, and reserve appearances for verified participation.
- Player pages use a persistent horizontal workspace navigation. Overview keeps compact identity
  and team context; Matches browses confirmed team-sheet records without presenting bench selection
  as an appearance. Stats is season-scoped, requests only the player statistic types shown, and
  keeps each player-and-season response in the local cache. When competition context is available,
  show the same compact URL-backed season selector and keep the date inside the selected season.
- Player Career shows the complete Sportmonks transfer history as a compact chronological list with
  direct links to both teams. Cache transfers as normalized records so the same foundation can power
  Team Transfers later. Do not display a transfer amount without a trustworthy currency.
- Coach pages keep identity, current club, career history, and recent club fixtures together in one
  focused view. Normalize coaches into the shared entity cache, link them from teams and fixture
  previews, and include them in global search. Team coach includes contain historical assignments;
  show only active assignments on Team Overview. Do not add empty navigation for speculative
  subpages.
- Referee profiles are reached through fixture officials. Keep each appointment's officiating role
  explicit, normalize its fixture into the shared cache, and label the `latest` history as the last
  six months rather than a complete career. Preserve fixture and season context on the return link.
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
- Track the goal of complete Sportmonks Football API coverage against the official endpoint index.
  Update `docs/sportmonks-coverage.json` whenever an endpoint or include becomes fully usable in the
  product, regenerate the report and badge with `pnpm coverage`, and refresh the upstream catalog
  with `pnpm coverage:refresh` when Sportmonks changes its documented API.
- Keep the README roadmap as a major-feature checklist. Check off shipped feature scope while the
  coverage catalog tracks the remaining endpoint and include detail.

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
