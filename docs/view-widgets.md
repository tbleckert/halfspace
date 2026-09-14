# View widgets

The [three accepted design studies](../design/generative-views/README.md) are our visual targets.
The supporter home is the first working slice. The researcher and analyst studies remain planned.

The application catalog is [`src/shared/view-widgets.ts`](../src/shared/view-widgets.ts).
It records implementation status, data context and column support, and supplies the available
widgets to both the manual editor and generation prompt. Planned entries are excluded from both;
the strict view schema also rejects them. Update the catalog and this inventory in the same change.

## Implemented

These widgets use shared cached football queries and the same saved definition, editor and undo flow.
Each accepts **1, 2 and 3 columns**. Width is presentation only: changing it retains identity, season,
selection and data. Compact tables retain essential values and link to the full entity workspace.

| Widget              | Data and scope                                                                                          | 1 column                                          | 2 columns                           | 3 columns                        |
| ------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------- | -------------------------------- |
| `team-next-match`   | Next scheduled team fixture across competitions, next 30 days                                           | Stacked teams and kickoff                         | Horizontal match presentation       | Larger horizontal presentation   |
| `team-season`       | Selected team, competition and season; provider standing groups                                         | Four facts in a compact grid, reported form below | Four facts across                   | Facts and form side by side      |
| `team-fixtures`     | Upcoming or recent team matches across competitions, 30 days either side of today                       | Single fixture list                               | Two fixture columns                 | Three fixture columns            |
| `team-availability` | Current reported team absences; independent of selected season                                          | Single player list                                | Two player columns                  | Three player columns             |
| `fixtures`          | Competition and season; 14-day upcoming/recent window                                                   | Single fixture list                               | Two fixture columns                 | Three fixture columns            |
| `standings`         | Complete reported standing groups for a competition and season; optional team highlight                 | Position, team, points and form                   | Adds played and goal difference     | Expanded team and table spacing  |
| `leaders`           | Season goals, assists, yellow cards or red cards; provider ranks and totals                             | Club beneath player name                          | Separate club column                | Expanded player and club spacing |
| `form-trend`        | Up to six completed team matches in the last 100 days, across all competitions; All/Home/Away selection | Compact goal chart and linked results below       | Taller chart and two-column results | Chart and results side by side   |

Presentation adapts to **actual container width**, so a two-column preference on a small window can
still use the compact arrangement. The canvas has three columns, reduces to two below 900px of
content width, and to one below 580px. Stored spans are retained when the window shrinks.

## Planned

All planned widgets must support all three column modes before being marked implemented.
An existing entity page or endpoint does not, by itself, mean its View widget is implemented.

| Widget                | First story | Remaining work                                                      |
| --------------------- | ----------- | ------------------------------------------------------------------- |
| `team-news`           | Supporter   | Relevant sourced news, team binding and article links               |
| `fixture-broadcasts`  | Supporter   | Fixture and country selection, broadcast query binding              |
| `player-profile`      | Analyst     | Player, club and season binding; reported minutes and metrics       |
| `player-comparison`   | Analyst     | Connected player selection, aligned per-90 metrics and sample sizes |
| `team-comparison`     | Analyst     | Independent team, season and home/away selections                   |
| `market-shortlist`    | Researcher  | Match filters and selection connected to evidence and prices        |
| `odds-comparison`     | Researcher  | Matching fixture, feed, market, line, outcome and quote freshness   |
| `probability-context` | Researcher  | Verified probability semantics, source, alignment and uncertainty   |

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
current absences (1), followed by form trend (2). Without current season metadata, the starter offers the four team-only
widgets and explains the missing season context. It works without an AI key.

For generation, try “Build a home for Arsenal using the Premier League.” Follow with “Prioritize
preparing for the next match; keep my season context and widths.” Check that supported widgets
use known identities, the follow-up preserves block identities and explicit settings, and the
result remains useful with missing data. Unsupported news, xG trends or research requirements must
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
