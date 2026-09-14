# View widgets

The [three accepted design studies](../design/generative-views/README.md) are our visual targets.
The catalog contains **14 implemented widgets and 2 planned widgets**.
The supporter home and player study are working compositions. The researcher study has bookmaker
price comparisons; match shortlisting and probability context remain planned.

The application catalog is [`src/shared/view-widgets.ts`](../src/shared/view-widgets.ts).
It records implementation status, data context and column support, and supplies the available
widgets to both the manual editor and generation prompt. Planned entries are excluded from both;
the strict view schema also rejects them. Update the catalog and this inventory in the same change.

## Implemented

These widgets use shared cached football queries and the same saved definition, editor and undo flow.
Each accepts **1, 2 and 3 columns**. Width is presentation only: changing it retains identity, season,
selection and data. Compact tables retain essential values and link to the full entity workspace.

| Widget               | Data and scope                                                                                                             | 1 column                                          | 2 columns                                           | 3 columns                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------- | -------------------------------- |
| `team-next-match`    | Next scheduled team fixture across competitions, next 30 days                                                              | Stacked teams and kickoff                         | Horizontal match presentation                       | Larger horizontal presentation   |
| `team-season`        | Selected team, competition and season; provider standing groups                                                            | Four facts in a compact grid, reported form below | Four facts across                                   | Facts and form side by side      |
| `team-fixtures`      | Upcoming or recent team matches across competitions, 30 days either side of today                                          | Single fixture list                               | Two fixture columns                                 | Three fixture columns            |
| `team-availability`  | Current reported team absences; independent of selected season                                                             | Single player list                                | Two player columns                                  | Three player columns             |
| `fixtures`           | Competition and season; 14-day upcoming/recent window                                                                      | Single fixture list                               | Two fixture columns                                 | Three fixture columns            |
| `standings`          | Complete reported standing groups for a competition and season; optional team highlight                                    | Position, team, points and form                   | Adds played and goal difference                     | Expanded team and table spacing  |
| `leaders`            | Season goals, assists, yellow cards or red cards; provider ranks and totals                                                | Club beneath player name                          | Separate club column                                | Expanded player and club spacing |
| `form-trend`         | Up to six completed team matches in the last 100 days, across all competitions; All/Home/Away selection                    | Compact goal chart and linked results below       | Taller chart and two-column results                 | Chart and results side by side   |
| `fixture-broadcasts` | Next fixture from a linked Next match widget; preferred country, all countries or an explicit country                      | Stacked match, country and station list           | Match and country side by side; two station columns | Three station columns            |
| `team-news`          | Up to three upcoming and three recent team fixtures, 30 days either side; Sportmonks previews and AI-written match reports | Linked headlines and sources                      | Two columns with excerpts                           | Three columns with excerpts      |
| `player-profile`     | Exact player, club, competition and season; reported identity, minutes and statistics                                      | Stacked identity and two-column facts             | Three-column facts                                  | Identity beside facts            |
| `player-comparison`  | Independent player, club and season samples; shared per-90 metrics and reported minutes                                    | Stacked paired metrics                            | Two metric columns                                  | Three metric columns             |
| `team-comparison`    | Independent team, competition, season and All/Home/Away scopes                                                             | Stacked paired metrics                            | Two metric columns                                  | Three metric columns             |
| `odds-comparison`    | Linked Next match; pre-match feed, selected market and bookmaker, exact lines/outcomes and quote times                     | Stacked outcomes and bookmaker prices             | Two outcome columns                                 | Three outcome columns            |

Presentation adapts to **actual container width**, so a two-column preference on a small window can
still use the compact arrangement. The canvas has three columns, reduces to two below 900px of
content width, and to one below 580px. Stored spans are retained when the window shrinks.

## Planned

All planned widgets must support all three column modes before being marked implemented.
An existing entity page or endpoint does not, by itself, mean its View widget is implemented.

| Widget                | First story | Remaining work                                                    |
| --------------------- | ----------- | ----------------------------------------------------------------- |
| `market-shortlist`    | Researcher  | Match filters and selection connected to evidence and prices      |
| `probability-context` | Researcher  | Verified probability semantics, source, alignment and uncertainty |

## Completion rule

For each new widget, verify:

- [ ] Typed definition and exact entity/season validation; no invented values or implicit substitutions.
- [ ] Shared data query, appropriate refresh behavior, and explicit loading, empty, unavailable and offline states.
- [ ] Deliberate, readable 1/2/3-column presentations, including long names and missing values.
- [ ] Keyboard-accessible editing, saving, reopening, duplication and undo.
- [ ] Focused tests at real boundaries and visual review in the Electron shell.
- [ ] Catalog and inventory updated together; the affected north-star story checked again.

## Supporter benchmark

Create a team home from an available team and its reported current competition/season. The default
composition is next match (2), season snapshot (1), calendar (1), highlighted standings (1) and
current absences (1), followed by form trend (2), where to watch (1) and team news (1). Without current season
metadata, the starter offers the six widgets that do not require a season and explains the missing
season context. It works without an AI key.

For generation, try “Build a home for Arsenal using the Premier League.” Follow with “Prioritize
preparing for the next match; keep my season context and widths.” Check that supported widgets
use known identities, the follow-up preserves block identities and explicit settings, and the
result remains useful with missing data. Unsupported general club or transfer news, xG trends or probability requirements must
produce an honest limitation rather than fabricated panels.

## Saved format

New definitions use version 2 with numeric `span: 1 | 2 | 3`. Existing version 1 records are upgraded
at the storage read boundary: `half` becomes 1 and `full` becomes 3. IDs, titles, bindings and undo
history are retained. Saving writes version 2; clearing football caches preserves saved definitions.

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

Where to watch references a Next match widget by its stable block ID. It shares that widget's
team-fixture query and selection rules, so a change of team or next fixture updates the broadcasts.
The scope is the next scheduled match across competitions in the next 30 days; arbitrary fixture
selection remains outside this slice. The editor can choose another Next match block. Removing a
source also removes its dependent broadcast and odds widgets in the same undoable edit.

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

Odds comparison follows a Next match widget through the same source binding as Where to watch.
Its saved market is automatic or explicit; its bookmaker choice is all or explicit. Automatic
market selection prefers match result when available. Unavailable explicit choices remain selected.
The shared odds comparison groups exact market descriptions, lines and outcomes, uses each
bookmaker's newest quotes, and retains stopped/suspended states and quote timestamps. The highest
available price is highlighted without implying expected value or a betting recommendation.
This slice uses pre-match prices only. Live odds, arbitrary fixture selection, market shortlisting
and probability estimates remain outside its scope.

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
