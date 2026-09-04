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
- Skip routine Sportmonks attribution on football data cards; name the provider only where account,
  access, or error context makes it useful. Align headings and team rows across adjacent match cards.
- Build the product outward through dedicated football entity pages and natural links between
  them. Prioritize entity depth before secondary tools or dashboards.
- Prioritize football data presentation, then dedicated design passes. Defer image exports and
  sharing until the visual design is settled; do not build export layouts ahead of that work.
- Horizontal local navigation uses one shared rule. Only the active item has its own indicator;
  inherit its color from the active text and layer it directly over the shared rule.
- Keep entity subpages nested beneath one persistent entity route shell so changing a horizontal
  navigation view does not remount shared data, headers, or context.
- Use scoped live queries for identity-dependent cache reads. Retain results during same-query
  background updates, but never show a previous entity, season, or date under a new query identity.
- Scope refresh errors and loading state to the current query and request as well. A response from
  a previous page must not overwrite the status of the page the user is viewing.
- Competition pages use horizontal local navigation for Overview, Fixtures, and Teams. Overview is
  the current-season snapshot, Fixtures browses the complete cached date window without truncating
  it, and Teams combines standings with fixture participants when a table is unavailable. Offer the
  ten most recent seasons in a compact URL-backed selector; keep standings and fixture windows
  season-scoped, and keep the selected season when changing competition views or opening a fixture.
  Changing the selected season must retain the active competition subpage.
- Competition tables show provider-reported played matches and goal difference from standing
  details, plus the last five W/D/L results from standing form. Request only the detail types shown;
  preserve missing values as unknown. Sort form by provider `sort_order`, oldest to newest, and link
  each result to its fixture with competition and season context intact.
- Show competition qualification and relegation places from `rule.type`, with matching row markers
  and a deduplicated legend. Keep provider labels and never infer rules from table positions.
- Competition Table browses the current table and reported standings for completed or current rounds.
  Keep round snapshots separate from current standings, keyed by season and round, and reject responses
  for a different query. Round selection is URL-backed and clears when the season changes. Reuse the
  schedule's round catalog, order numbered rounds numerically, and never fabricate historical tables.
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
- Competition Team of the Week browses the latest selection and explicit season rounds. Cache each
  query separately, hydrate shared player and team identities, preserve season context in links,
  and never display a latest selection from another season as the selected season's team.
- Fixture pages keep Preview, Game, Commentary, Lineups, Stats, and Odds in horizontal navigation
  inside the score hero. Resolve generic fixture links to Preview before play and Game once the
  match has started, including breaks and completed matches. Keep postponed and cancelled fixtures
  on Preview. Record that initial choice in the URL; explicit subpages always win, and background
  status updates must not change the active view. Preview stacks the venue card below Details.
  Before recording a default fixture subpage, check the router's latest destination so an early
  explicit navigation cannot be overwritten by a delayed render effect.
- Keep fixture subview presentation in focused components. The persistent entity shell owns shared
  queries, header, and navigation; reuse the shared Card surface for each view's data panels.
- Fixture Preview pairs that supporting column with season table context, each team’s five most
  recent completed matches before kickoff, and recent head-to-head meetings. Reuse standings and
  team-fixture caches, cache head-to-head separately, and prefetch Preview on intent.
- Fixture Preview shows match-specific absences from `sidelined.player` and `sidelined.type`, grouped
  by `participant_id` with linked player profiles. Preserve historical match absences separately
  from current team availability and distinguish missing data from no reported absences.
- Keep `weatherReport` in a compact Preview card. Distinguish recorded conditions from forecasts,
  use reported temperature units, and never infer kickoff weather from daily values. Omit missing
  weather and measurements whose units are unknown. Preserve weather and absences during list refreshes.
- Sportmonks fixture detail owns events, statistics, and lineups; fixture list refreshes must
  preserve that richer cached detail. Fetch and cache the much larger odds payload only when the
  Odds view opens.
- Fixture Game pairs Pressure and compact key stats in a 2:1 grid, with the full-width timeline
  below. Stack the cards on narrower screens. Show possession, shots, shots on target, big chances,
  and corners when reported, with comparison bars and a Full stats link. Omit unavailable pressure
  instead of reserving an empty card, and let key stats use the available width. Keep detailed match
  and player performance metrics in Stats.
- Fixture Game shows per-minute Sportmonks Pressure Index bars, home above zero
  and away below, on the same scale. Keep original values rather than percentages or smoothed
  estimates, and leave missing readings absent. Load pressure only on Game, cache per fixture,
  and refresh every 30 seconds while an ongoing match's Game view is open. Annotate goals and
  dismissals with their original match-minute labels, excluding rescinded events. Pressure records
  have no period IDs; preserve reported minutes without guessing halftime offsets. Access requires
  the fixture resource and Pressure Index enrichment; empty data alone is not an access denial.
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
- Team Overview links provider-reported rival clubs in a compact card. Cache rival relationships
  per team for a day, deduplicate both directions, and hydrate the shared team cache without
  replacing richer detail. Rival links keep the date but resolve their own competition and season.
- Team Overview shows rankings from the supported team `rankings` include. Name the ranking system,
  preserve reported points, and omit empty rankings. Do not invent a season, update date, or global
  ranking meaning; the standalone beta ranking endpoints are a separate resource.
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
- Period minutes can be null, including penalty shootouts. Preserve the missing value and fall
  back to the match phase; never reject the entire fixture window or invent a zero-minute clock.
- Fixture timelines include the event player relationship so player portraits can accompany events.
  Respect Sportmonks `sort_order` when sequencing events that share a match minute.
- Fixture Commentary is lazy-loaded from the dedicated non-paginated endpoint. Keep it cached per
  fixture, newest first by provider `order`, with an All updates / Key events filter and linked
  player identities. Refresh every 30 seconds only while an ongoing match's Commentary tab is open.
- Fetch pre-match and in-play odds lazily from their dedicated non-paginated endpoints into separate
  caches. Refresh in-play odds every 30 seconds only while an ongoing match's Odds view is open.
  Keep feed, market, and bookmaker selections in the URL. Compare like-for-like outcomes and lines,
  retain provider update times, and exclude stopped or suspended quotes from price highlights.
- Fixture TV guide uses fixture-specific `tvStations.tvStation` and `tvStations.country` includes;
  a station's general countries do not establish where a particular match is broadcast. Cache the
  guide separately, filter by country, and distinguish an empty guide from unavailable data. Keep
  it in a compact Preview card below the venue, not a separate tab, with long station lists contained
  in a scrollable region. Preserve distinct provider station IDs; similar names alone are not enough
  to merge broadcasters.
- Settings shows the token's Football plans, add-ons, and feature access from My Resources and My
  Enrichments. Keep access separate from coverage: an included feature can have no data for a
  particular league or fixture. Unknown access is not a denial, and empty results do not imply an
  upgrade. Clear subscription metadata with the rest of the cache when credentials change.
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
- The Transfers hub browses latest-updated records and transfer-date ranges of at most 31 days.
  Cache each feed page separately with explicit `hasMore`; do not present a page as a complete feed.
  Scope local player, club, and status filters to the displayed page. Preserve normalized transfer
  details across feed and career refreshes, and show unknown clubs as unknown, not free agency.
- Coach pages keep identity, current club, career history, and recent club fixtures together in one
  focused view. Normalize coaches into the shared entity cache, link them from teams and fixture
  previews, and include them in global search. Team coach includes contain historical assignments;
  show only active assignments on Team Overview. Do not add empty navigation for speculative
  subpages.
- Referee profiles are reached through fixture officials. Keep each appointment's officiating role
  explicit, normalize its fixture into the shared cache, and label the `latest` history as the last
  six months rather than a complete career. Preserve fixture and season context on the return link.
- Referee season stats reuse the profile cache with `statistics.details` and `statistics.season.league`.
  Offer the ten most recent reported seasons per competition. Keep the `statsSeason` selection separate
  from the originating fixture's season, show provider counts and averages, and keep straight red and
  second-yellow cards separate. Never derive these totals from the recent appointments list.
- Refresh fixture pages through the fixture-by-ID endpoint. When fixture lists update shared cache
  records, preserve richer match context already fetched for the entity page.
- Keep normalized fixture state and daily query snapshots monotonic by request timestamp so late
  responses cannot roll newer data back. Refresh subscription membership without deleting entity
  identities discovered elsewhere; catalog membership and cached identity are separate concerns.
- Read existing records and merge or remove cached data inside the same write transaction. Never
  prepare a replacement from a pre-transaction snapshot that concurrent refreshes can invalidate.
- Show every active subscribed competition in the sidebar when there are 10 or fewer. Above 10,
  show only locally pinned competitions.
- Global entity search opens from a standard navigation row immediately above Settings or with
  Command-K. Do not style the trigger like an input. Show cached Dexie results immediately, then
  search Sportmonks through main and hydrate the existing entity tables. Keep the palette opaque
  and free of open and close animation. Until a query is entered, show only the search row without
  a divider or reserved results area.
- Global search includes matches and referees. Match results show competition, date, score, and
  status; request recent matches first with `order=desc`. Reuse shared fixture and referee caches,
  preserving richer match detail, referee appointments, and newer data when search updates identity.
- Keep navigation prefetch non-blocking and stale-aware. TanStack Router preloads routes on intent;
  data intent should warm the existing Dexie queries without bypassing their TTLs. After startup,
  warm today’s Matchday and each visible sidebar competition in the background, one competition at
  a time, so likely destinations are ready without flooding Sportmonks. Prefetch fixture, team,
  squad, player, and venue detail on keyboard focus or deliberate hover; cancel incidental hovers,
  and keep fixture Odds lazy until that view opens.
- Pause automatic query refreshes while offline or hidden. On focus or reconnect, refresh only
  overdue data; retry failed stale queries at a bounded cadence without overlapping requests.
- Keep authentication, timeouts, response parsing, and rate-limit backoff in the shared main-process
  Sportmonks client. Honor each entity's cooldown without blocking unrelated entities, and clear
  cooldowns and notices when credentials change. Never cache a partial paginated response as complete.
- Changing credentials resets the mounted workspace and all pending refresh/search generations.
  Gate the workspace until cached football data has been cleared; surface reset failures and retry
  the reset before reopening. Stop abandoned sidebar warming queues on unmount or disconnect.
- Track the goal of complete Sportmonks Football API coverage against the official endpoint index.
  Update `docs/sportmonks-coverage.json` whenever an endpoint or include becomes fully usable in the
  product, regenerate the report and badge with `pnpm coverage`, and refresh the upstream catalog
  with `pnpm coverage:refresh` when Sportmonks changes its documented API.
- Keep coverage checks in CI. Weekly upstream catalog refreshes propose only generated catalog,
  report, and badge changes in a draft PR; never infer product support or merge automatically.
  Mark refresh PRs ready for review to trigger CI after checking the upstream changes.
- Keep the README roadmap as a major-feature checklist. Check off shipped feature scope while the
  coverage catalog tracks the remaining endpoint and include detail.
- Keep the public README product-first, with the canonical logo centered at the top. Leave app
  screenshots out until the planned subscription upgrade and news work are ready to show; describe
  unshipped features only in the roadmap.
- Comparisons start with a team or player, then that entity's ten most recent available seasons.
  Discover season records through `statistics.season.league` and player clubs through `statistics.team`;
  cache this metadata per entity separately from the lazily loaded performance details. Omit records
  without values or accessible season and competition context. Group equivalent year labels such as
  2025/26 and 2025/2026, but keep calendar-year and cross-year seasons distinct. Show club/competition
  as quiet context when only one record exists; reveal a combined selector only for multiple records.
  Reuse team and player season-statistic caches with independent context for each side. Allow
  cross-league comparisons and the same entity in different seasons. Keep entity, resolved season,
  and player club selections in the URL, derive competition from the record, and swap the entire context.
  Compare one explicit club record per player; never combine unweighted averages across clubs.
  Missing values remain unknown, not zero. Search candidates through the existing typed search API,
  restricted to teams or players. Player radars use reported actions per 90 from each selected club
  record, with at least four shared metrics and positive reported minutes on both sides. Scale each
  axis to the pair's larger value, explicitly not a league percentile or league-strength adjustment;
  show actual values and playing time alongside the chart. Keep exact season totals below.

## Expanded Football Data

- Competition Knockout reuses the season schedule, bracket edges, and stage aggregates. Preserve
  fixtures nested inside schedule aggregates. Group legs only by explicit aggregate IDs, distinguish
  placeholders from real teams, and use reported aggregate winners. Prefer provider advancement
  edges; infer a result link only when the winner is a known participant in the immediately following
  round. Never skip an unreported round or invent an undrawn path. Keep season context in links.
- News uses separately cached feed pages with explicit pagination, competition/season filters, and
  a plain-text article reader. Order article lines by ID, preserve paragraphs, label AI-written
  reports, and call the fixture date Match date rather than inventing a publication time. Fixture
  Preview and Game show their related news. Sparse fixture context from news must never overwrite
  richer shared fixture records; nested fixture includes are unsupported on news endpoints.
- Match facts belong in Fixture Preview with team, category, and scope filters. Fetch every page
  before caching the response; show provider-written facts verbatim and omit records without wording.
  A fact labelled streak can mean X of Y recent matches, not consecutive matches. Preserve that
  distinction and keep empty results separate from denied access.
- Predicted lineups use their own fixture-keyed cache and only appear before play when confirmed
  team sheets are absent. Label them explicitly, reuse the shared pitch, and never add predictions to
  confirmed lineups, appearances, event annotations, or ratings. Confirmed sheets take precedence.
- Honours use separately cached trophy includes for teams, players, and coaches. Show competition,
  season, club, and reported placing; distinguish winners from runners-up and preserve unknown
  metadata. Never present every trophy record as a title or imply the available history is complete.

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
