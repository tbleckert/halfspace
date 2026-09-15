# View widgets

The [three accepted design studies](../design/generative-views/README.md) are our visual targets.
The catalog contains **22 implemented widgets and 0 planned widgets**.
The supporter home, player study, match preparation and match research are working compositions.
Research connects a full-time result shortlist to prices, provider probabilities and match context.
Probability gaps, value rankings and profitability claims remain outside the implemented scope.

The application catalog is [`src/shared/view-widgets.ts`](../src/shared/view-widgets.ts).
It records implementation status, data context and column support, and supplies the available
widgets to both the manual editor and generation prompt. Planned entries are excluded from both;
the strict view schema also rejects them. Update the catalog and this inventory in the same change.

## Implemented

These widgets use shared cached football queries and the same saved definition, editor and undo flow.
Each accepts **1, 2 and 3 columns**. Width is presentation only: changing it retains identity, season,
selection and data. Compact tables retain essential values and link to the full entity workspace.

| Widget                 | Data and scope                                                                                                             | 1 column                                          | 2 columns                                           | 3 columns                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------- | -------------------------------- |
| `team-next-match`      | Next scheduled team fixture across competitions, next 30 days                                                              | Stacked teams and kickoff                         | Horizontal match presentation                       | Larger horizontal presentation   |
| `team-season`          | Selected team, competition and season; provider standing groups                                                            | Four facts in a compact grid, reported form below | Four facts across                                   | Facts and form side by side      |
| `team-season-results`  | Completed team matches from the reported schedule for an exact competition and season, including historical seasons        | Bounded single fixture list                       | Two fixture columns                                 | Three fixture columns            |
| `team-fixtures`        | Upcoming or recent team matches across competitions, 30 days either side of today                                          | Single fixture list                               | Two fixture columns                                 | Three fixture columns            |
| `team-availability`    | Current reported team absences; independent of selected season                                                             | Single player list                                | Two player columns                                  | Three player columns             |
| `fixtures`             | Competition and season; 14-day upcoming/recent window                                                                      | Single fixture list                               | Two fixture columns                                 | Three fixture columns            |
| `standings`            | Complete reported standing groups for a competition and season; optional team highlight                                    | Position, team, points and form                   | Adds played and goal difference                     | Expanded team and table spacing  |
| `leaders`              | Season goals, assists, yellow cards or red cards; provider ranks and totals                                                | Club beneath player name                          | Separate club column                                | Expanded player and club spacing |
| `form-trend`           | Up to six completed team matches in the last 100 days, across all competitions; All/Home/Away selection                    | Compact goal chart and linked results below       | Taller chart and two-column results                 | Chart and results side by side   |
| `fixture-broadcasts`   | Resolved fixture from a linked match source; preferred country, all countries or an explicit country                       | Stacked match, country and station list           | Match and country side by side; two station columns | Three station columns            |
| `team-news`            | Up to three upcoming and three recent team fixtures, 30 days either side; Sportmonks previews and AI-written match reports | Linked headlines and sources                      | Two columns with excerpts                           | Three columns with excerpts      |
| `player-profile`       | Exact player, club, competition and season; reported identity, minutes and statistics                                      | Stacked identity and two-column facts             | Three-column facts                                  | Identity beside facts            |
| `player-comparison`    | Independent player, club and season samples; shared per-90 metrics and reported minutes                                    | Stacked paired metrics                            | Two metric columns                                  | Three metric columns             |
| `team-comparison`      | Independent team, competition, season and All/Home/Away scopes                                                             | Stacked paired metrics                            | Two metric columns                                  | Three metric columns             |
| `odds-comparison`      | Linked match source; pre-match feed, selected market and bookmaker, exact lines/outcomes and quote times                   | Stacked outcomes and bookmaker prices             | Two outcome columns                                 | Three outcome columns            |
| `fixture-head-to-head` | Linked match participants; up to five completed previous meetings before kickoff, across competitions                      | One match column                                  | Two match columns                                   | Three match columns              |
| `fixture-absences`     | Reported absences for both teams in the linked match                                                                       | Teams stacked                                     | Teams side by side                                  | Two player columns per team      |
| `fixture-weather`      | Linked match's provider weather report; forecast/recorded status and known units                                           | Conditions above two-column facts                 | Three-column facts                                  | Conditions beside facts          |
| `team-squad`           | Exact team and season squad; up to twelve players, with a link to the full reported squad                                  | One player column                                 | Two player columns                                  | Three player columns             |
| `team-transfers`       | Up to six completed moves in the last 365 days; All/Incoming/Outgoing selection                                            | One transfer column                               | Two transfer columns                                | Three transfer columns           |

| `market-shortlist` | All available competitions by default, or an explicit competition and season; seven-day or weekend window, full-time result prices, outcome filter and selected match | One match column | Two match columns | Three match columns |
| `probability-context` | Linked match; Sportmonks pre-match result, BTTS or goals 2.5 probabilities, provenance and missing-data context | Stacked outcomes and source | Outcomes side by side | Outcomes across; source and uncertainty side by side |

Presentation adapts to **actual container width**, so a two-column preference on a small window can
still use the compact arrangement. The canvas has three columns, reduces to two below 900px of
content width, and to one below 580px. Stored spans are retained when the window shrinks.

The canvas packs measured widget heights into these columns. It keeps the first widget anchored,
looks ahead one widget when a narrow card precedes a wider one, and keeps full-width cards as section
boundaries. The saved definition, widget order and native keyboard order remain unchanged. Column
assignments are retained while data loads or refreshes; heights are measured again to prevent overlaps.
Changing the arrangement or crossing a column breakpoint computes a fresh placement. This reduces
row-height gaps without stretching cards, changing their spans or rearranging entire sections.

## Scope

Views have no global competition or season. Broad match research uses the shared date-window fixture
query across available competitions and shows each match’s competition. Exact filters remain optional
in the block editor. Partial cached date windows are labelled and never presented as complete coverage.

An explicit historical prompt resolves named teams’ reported season metadata before generation and
prioritizes the requested season over recent-season defaults. Season results, standings, season snapshots,
squads and leaders retain their own exact bindings. Current fixtures, absences, news and transfers do not
represent historical seasons. Unsupported identities remain unavailable rather than being substituted.

## Composition size and loading

Views have no fixed widget-count limit. Generation defaults to 6–8 useful widgets for a broad
dashboard, uses fewer for focused requests, and can include more when requested or needed. Refining
a larger view preserves its existing widgets unless the requested edit changes them. Model output
still has a finite token budget; incomplete generation leaves the last usable definition intact.

Manual editing, streamed drafts and saved definitions use the same uncapped widget list. All
widgets retain their 1/2/3-column preferences. Offscreen widget content mounts as it approaches
within 400px of the canvas viewport, or receives keyboard focus. Deferred cards show their title;
they do not claim a data request is running. Generation placeholders remain immediate.

Current absences and Team news keep their headings above an independently scrollable body, capped
at 470px or 60% of the window height, whichever is smaller. Short and empty states keep their natural
height. Both remain keyboard accessible and retain their 1/2/3-column arrangements. This controls
presentation height without truncating records or changing either widget's data scope.

Once visited, widgets remain mounted to preserve controls and shared-query subscriptions. This
reduces the initial data burst; it does not virtualize visited cards or bound the memory of an
arbitrarily large canvas. Existing cache, deduplication, offline and refresh rules still apply.

## Planned

All planned widgets must support all three column modes before being marked implemented.
An existing entity page or endpoint does not, by itself, mean its View widget is implemented.

No catalog entries are currently planned. The boundaries and remaining research capabilities below
are tracked separately from completed widget contracts.

## Completion rule

For each new widget, verify:

- [ ] Typed definition and exact entity/season validation; no invented values or implicit substitutions.
- [ ] Shared data query, appropriate refresh behavior, and explicit loading, empty, unavailable and offline states.
- [ ] Deliberate, readable 1/2/3-column presentations, including long names and missing values.
- [ ] Keyboard-accessible editing, saving, reopening, duplication and undo.
- [ ] Focused tests at real boundaries and visual review in the Electron shell.
- [ ] Catalog and inventory updated together; the affected north-star story checked again.

## Supporter benchmark

A team home is club-wide by default. Matches, form, absences, broadcasters and news follow the team
across competitions. Multiple current competitions do not require the user to choose one before
creating a home.

Season snapshots and standings retain an explicit competition and season. Generation honors a
competition the user names; otherwise, it uses the team's verified current memberships. A single
reported league context supplies the main snapshot and table. Other competitions can have separate
snapshots when useful. Competition type comes from cached provider metadata, never the name. When
no single league context is identifiable, generation can show separately scoped snapshots or omit
optional season widgets while still creating the home. Missing season context also leaves the
club-wide composition available. Clarification is reserved for an unresolved team identity or an
explicit request that needs a specific competition or season.

The manual starter defaults to a reported league when available, with an optional season selector.
Its default composition is next match (2), season snapshot (1), calendar (1), highlighted standings
(1), current absences (1), form trend (2), where to watch (1) and team news (1). Without current season
metadata, it offers the six widgets that do not require a season. It works without an AI key.

For generation, try “Create a home for my team Juventus” with several current competitions available.
It should compose a home without asking for a competition. Also try “Build a home for Arsenal using
the Premier League.” Follow with “Prioritize
preparing for the next match; keep my season context and widths.” Check that supported widgets
use known identities, the follow-up preserves block identities and explicit settings, and the
result remains useful with missing data. Unsupported general club or transfer news, xG trends or probability requirements must
produce an honest limitation rather than fabricated panels.

## Saved format

New definitions use version 3 with numeric `span: 1 | 2 | 3`. Existing version 1 records are upgraded
at the storage read boundary: `half` becomes 1 and `full` becomes 3. IDs, titles, bindings and undo
history are retained. Version 2 next-match links migrate to `fixtureSourceBlockId`, preserving block
IDs and saved selections. Migration runs only when reading storage; model and IPC requests use the
strict version 3 contract. Saving writes version 3; clearing football caches preserves saved definitions.

## Form trend scope

Form trend selects up to six completed matches after applying All/Home/Away, within the last
100 local calendar days. It uses the existing paginated team-fixture query and normalized cache,
with matches ordered oldest to newest. It is independent of the View's selected historical season.
Competition-specific samples, xG and other performance metrics remain unsupported.

The paired bars show reported goals scored and conceded on one shared scale, with exact values
and linked opponents below or alongside. Sportmonks' [CURRENT score definition](https://docs.sportmonks.com/v3/tutorials-and-guides/tutorials/includes/scores)
includes extra time and excludes shootout kicks. Result badges retain reported shootout winners;
an unreported shootout winner stays unknown. Missing scores remain in the sample with gaps and
explicit unknown values. Empty queries and data unavailable offline have distinct states.

The All/Home/Away selection is part of the saved definition and shares the existing save,
duplicate, undo and generation flow. Width changes preserve the sample selection.

## Verification checkpoint · 13 September 2026

- The supporter starter, manual widths, saving/reopening offline, undo and version 1 migration
  pass focused tests. Schema tests accept all seven implemented widgets at all three spans and
  reject planned types and unknown identities.
- All seven widgets passed overflow checks at 1/2/3 spans in 1740, 1512, 1240 and 900px windows
  (84 widget/size combinations), using example data and long names. Empty and unavailable states
  were checked separately. Keyboard dialog activation, Escape and restored focus passed.
- The supporter home was visually reviewed in an isolated Electron shell at 1512 and 900px,
  using the real renderer, shared cache and example data. This is not a live Sportmonks data audit.
- A real OpenAI request produced the five intended supporter widgets. A follow-up reordered
  match preparation while retaining IDs, team/season bindings and a manually widened fixture
  widget. A request for unsupported team news returned a clear limitation and no replacement
  blocks. These are smoke checks; model composition still needs review against the three stories
  as the library grows.
- Repository tests, typecheck, lint, formatting, coverage checks and production build passed.

## Verification checkpoint · 14 September 2026

- Form trend is available in supporter starters, the manual editor and generation. Schema tests
  validate all three spans and reject unknown teams and unsupported sample scopes.
- Focused tests cover match ordering, home/away selection, the local date boundary, missing
  scores and shootout results. The route test verifies filtering, undo, save/reopen and duplication
  with cached data and no AI request.
- All three spans passed Electron overflow checks at 1740, 1512, 1240 and 900px window widths.
  Desktop, narrow layouts and the supporter composition were visually reviewed with example data.
  Browser checks also covered long names, missing scores, empty and uncached states, and keyboard focus.
- The serialized OpenAI schema and a streamed form widget pass the mocked provider contract test.
  A live generation request and live Sportmonks data audit were not repeated for this addition.
- `pnpm check` passed all 848 tests, typecheck, lint, formatting and coverage checks; production
  build passed. No additional Sportmonks capability is claimed for composing existing data.

## Where to watch scope

Where to watch references a Next match or Market shortlist widget by its stable block ID. A Next match
source shares its team-fixture query and selection rules, so changing team or next fixture updates the
broadcasts. That scope is the next scheduled match across competitions in the next 30 days. A shortlist
source follows the user's selection within its date window instead. The editor can choose either
kind of source; removing one also removes all its dependents in the same undoable edit.

The country choice is saved in the View: the app's preferred TV country (default), all countries,
or an explicit country ID. With no preferred country, the default shows all countries. Local edits
do not change the app preference. Unavailable country selections remain selected with an empty
state. Country names for generation come from cached TV listings, the preferred country and saved
selections; unknown requested countries are rejected. Saved IDs survive football-cache clearing.

The widget reuses the fixture TV cache and subscription checks. It distinguishes uncached/offline,
loading, request failures, plan exclusions and empty listings, and preserves cached broadcasts during
refresh. Station links open the existing broadcaster workspace with fixture, competition and season
context. Distinct provider station identities are retained even when their names match.

### Broadcast verification · 14 September 2026

- Focused tests cover reference validation, unknown countries, streaming dependencies, fixture and
  team changes, late updates for an old fixture, country filtering, manual addition, dependent removal,
  undo, saving/reopening and duplication without AI.
- All three spans passed overflow checks in Electron at 1740, 1512, 1240 and 900px window widths.
  Compact, wide, full-width and supporter compositions were visually reviewed with example data,
  including long names and missing broadcaster details.
- The serialized OpenAI request schema and streamed connected widget pass the mocked provider
  contract. Live OpenAI generation and a live Sportmonks data audit were not repeated for this widget.
- Loading, request failure/retry, confirmed empty listings and plan exclusions pass route tests.
- Keyboard dialog activation, Escape and restored focus passed browser checks. Repository tests,
  typecheck, lint, formatting, coverage checks and the production build passed.
- No additional Sportmonks capability is claimed for composing existing data.

## Player study and comparisons

The player-study starter uses two profiles and a comparison with the same explicit player, club,
competition and season selections. Available players come from the local cache; season options
come from the shared statistic-season query. Users choose each club and season before creating
or adding a statistical widget. The editor supports independent selections on every widget;
changing one profile does not silently rebind another widget. No AI key is required.

Player comparisons show only shared metrics with reported minutes above zero, using the existing
per-90 calculation. Team comparisons preserve independent All/Home/Away scopes and show unknown
values when that scope is not reported. Both display their samples and link to the full comparison
workspace. Generation can use only known exact statistical selections; current saved selections
remain valid when disposable football caches are cleared.

## Team news scope

Team news reuses the team-fixture and fixture-news queries. It shows previews and match reports
for up to three upcoming and three recent fixtures in the 30-day windows around today. Each item
links to its fixture and article, names Sportmonks as its source, and labels AI-written reports.
General club, transfer and breaking news are outside this widget's scope. Empty fixture windows,
missing articles, uncached data and request failures have distinct states.

## Odds comparison scope

Odds comparison follows a Next match or Market shortlist through the same source binding as Where to watch.
Its saved market is automatic or explicit; its bookmaker choice is all or explicit. Automatic
market selection prefers match result when available; a shortlist source always defaults to full-time result. Unavailable explicit choices remain selected.
The shared odds comparison groups exact market descriptions, lines and outcomes, uses each
bookmaker's newest quotes, and retains stopped/suspended states and quote timestamps. The highest
available price is highlighted without implying expected value or a betting recommendation.
This slice uses pre-match prices only. Live odds and arbitrary fixture IDs remain outside its scope. Match selection and reported probabilities
are provided through the separate research widgets.

### Five-widget verification · 14 September 2026

- All five definitions accept 1/2/3 spans. Validation rejects unknown player/club/season tuples,
  unknown explicit market/bookmaker IDs and invalid match-source references.
- Route tests cover scoped statistics, missing values, article identity, suspended quotes, manual
  addition, independent editing, widths, saving/reopening, duplication, undo and cache clearing.
  The player-study starter creates matching profile and comparison selections without AI.
  Online comparisons restore identities and exact season labels after clearing football caches.
- The serialized OpenAI request schema and all five streamed widget types pass the mocked provider
  contract. Live generation and a live Sportmonks data audit were not repeated for this batch.
- All five passed Electron overflow checks at all three spans in 1740, 1512, 1240 and 900px windows
  (60 combinations). Supporter and analyst compositions were visually reviewed with example data.
- No additional Sportmonks capability is claimed for composing existing data.
- The player-study starter was visually reviewed in Electron. Keyboard dialog activation, Escape
  and restored focus passed browser checks.
- `pnpm check` passed 881 tests, typecheck, lint, formatting and coverage checks; the production
  build passed.

## Match preparation

The **Prepare next match** action uses the selected team's Next match as the source for weather,
previous meetings, match absences and broadcasters. When the team has an available current season,
it also includes that season's squad, followed by recent transfers. Every match-dependent widget
follows the source's team and next fixture. Changing its source, removing dependents, width changes,
saving, duplication and undo use the same editor and saved format.

Head-to-head uses the shared paginated query for the exact pair, then shows at most five completed
meetings before both now and the source kickoff. It is a cross-competition sample, not an all-time
record or a forecast. Unknown scores stay unknown, and each result links to its own fixture context.
Match absences distinguishes unavailable data from an explicitly empty list and retains both teams.
Weather uses the provider's forecast/recorded label and reported units; missing or unknown-unit
measurements remain unknown. No football effect is inferred from weather or prior meetings.

Squad uses the exact team-season cache, with squad-reported positions and shirt numbers. Historical
squads do not inherit a player's current position. The card displays up to twelve players and links
to the complete squad for that selection. Transfers includes only provider-reported completed moves
within the last 365 local calendar days, with direction filtered before the six-row display limit.
Pending moves, future-dated records and rumours are excluded. Missing counterpart clubs stay unknown;
fees are omitted because this surface does not establish their currency. Transfer scope is independent
of other widgets’ season selections. Explicit selections and spans survive football-cache clearing.

### Match-preparation verification · 14 September 2026

- All five definitions accept and persist all three spans. Unknown team/season identities,
  missing match references and unsupported transfer scopes are rejected.
- Route checks cover scoped weather and absence identities, an unknown weather unit, exact squad
  seasons, transfer direction/date filtering, manual addition, source removal, undo, saving,
  reopening, duplication and the match-preparation starter. Retry resolves into an explicit empty
  weather report, and late fixture responses do not replace the selected match's details.
- The serialized OpenAI request schema and all five streamed widget types pass the mocked provider
  contract. Live OpenAI generation and a live Sportmonks data audit were not repeated for this batch.
- All five passed Electron overflow checks at all three spans in 1740, 1512, 1240 and 900px windows
  (60 combinations). The match-preparation composition and empty states were reviewed with example
  data. Historical meeting dates include their year and passed six additional layout checks.
- Keyboard activation of the starter and editor, Escape and restored focus passed browser checks.
- No additional Sportmonks capability is claimed for composing existing data.
- `pnpm check` passed 899 tests, typecheck, lint, formatting and coverage checks; the production
  build passed.

## Match research

The **Research matches** starter creates a Market shortlist (2 columns), Probability context (1),
Odds comparison (3), Head-to-head (2) and Match absences (1). Selecting a match updates every linked
card. All six match-dependent widget types, including weather and broadcasters, can follow either
Next match or a shortlist. Source deletion removes dependents in the same undoable edit.

The shortlist spans all available competitions by default; an explicit filter binds it to one
competition and season. Its rolling window is today plus six days,
or Saturday/Sunday of the current or upcoming weekend in the user's time zone. Only future,
not-started fixtures in that window are included. Six matches are shown per page in kickoff order;
price fetching is limited to that page. Each outcome shows its highest active, newest-per-bookmaker
standard full-time result quote. The oldest displayed quote time stays visible; expandable details show each bookmaker,
quote timestamp and separate fetch time. Other periods,
handicaps and totals are excluded. The home/draw/away filter changes displayed outcomes, not fixture
membership. Missing prices stay visible and never imply denied access or a betting opportunity.

A null selection follows the first match. An explicit selection stays selected when it becomes
unavailable or leaves the window; connected cards show that state instead of choosing another match.
Changing competition/season clears the old fixture selection. Saving, undo, duplication and football
cache clearing retain explicit selections and source links. Generation may select only a known fixture
within its scope, or use automatic selection. Broad discovery accepts known fixtures from any
available competition; scoped discovery retains the exact competition and season.

Probability context uses the existing fixture prediction query and provider-reported percentages:
full-time result (type 237), BTTS (231), and over/under 2.5 (235). Mappings were checked against the
[Sportmonks probability guide](https://docs.sportmonks.com/v3/tutorials-and-guides/tutorials/odds-and-predictions/predictions/probabilities)
and [provider examples](https://www.sportmonks.com/blogs/how-to-use-the-sportmonks-football-predictions-api/).
Missing outcomes remain unknown, zero stays zero, duplicate reports are treated as conflicting,
and percentages are never renormalized. The card labels Sportmonks as its pre-match model source,
shows fetch time separately and states that model update time, calibration and confidence intervals
are not supplied in this report. It does not calculate probability gaps, expected value or recommendations.

### Research verification · 14 September 2026

- Storage migration preserves v1/v2 layouts, source links and undo definitions; new requests use v3.
- Schema and serialized OpenAI contract checks cover both widgets, all spans, exact selected-fixture
  identity and invalid source references. Unsupported generated selections are rejected.
- Route checks cover connected selection, late results, explicit selection leaving the window,
  outcome/market filters, missing/zero probabilities, save/reopen, duplication, cache clearing,
  manual addition, source removal, undo and the research starter.
- No additional Sportmonks capability is claimed. Live OpenAI generation and live provider data
  were not checked in this batch.
- Refresh failure/retry preserves cached probabilities until a complete response arrives. Price queries
  are limited to the visible six-match page, and subscription denial is distinct from empty predictions.
- Both new widgets passed Electron overflow checks for all three spans at 1740, 1512, 1240 and
  900px window widths (24 combinations). The revised starter, expanded quote details, missing
  probabilities and an unavailable explicit match selection were visually reviewed with example data.
- Browser keyboard checks passed starter creation, editor activation, Escape/focus restoration,
  connected match selection and quote-detail disclosure.
- `pnpm check` passed 915 tests, typecheck, lint, formatting and coverage checks; the production
  build passed.
