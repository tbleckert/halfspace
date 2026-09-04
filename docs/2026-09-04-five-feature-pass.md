# Five-feature data presentation pass

Scope: use the expanded 30-competition subscription to deepen football data presentation.
Keep the existing design language; sharing and broad design passes remain deferred.

## Delivery checklist

- [x] Knockout brackets and tournament progression: season-scoped competition view; round/tie
      presentation, both legs and aggregate results, known winners, placeholder teams, and trustworthy
      advancement links. Use provider bracket edges where available and stage/schedule/aggregate data
      for domestic cups without bracket metadata. Never invent an undrawn progression path.
- [x] News: paginated preview/report browsing, readable articles, competition/season context and
      links to fixtures; surface relevant articles in fixture views. Preserve paragraph order and label
      AI-written post-match reports. Plain-text rendering only.
- [x] Match facts: fixture preview facts with meaningful category/team/scope filters. Preserve
      provider wording and sample context, distinguish empty from inaccessible data, and do not turn
      provider counts into invented claims.
- [x] Predicted lineups: show the provider prediction before confirmed team sheets exist, reuse
      the shared pitch, clearly label predictions, and keep predictions out of confirmed appearance
      history and confirmed lineup caches.
- [x] Honours: team, player, and coach trophy records with competition, season, club, and placing.
      Keep winners distinct from runners-up and do not claim unavailable records are a complete career.

## Shared completion gates

- [x] Typed main-process requests, narrow validated IPC, local query caches, scoped refresh/errors,
      credential invalidation, and provider access handling for each new resource.
- [x] Behavior tests for data boundaries, query identity, partial pagination, and navigation.
- [x] Live provider verification and rendered visual/interaction checks for each feature.
- [x] Update AGENTS.md, the README checklist, and Sportmonks coverage for shipped scope only.
- [x] `pnpm typecheck`, `pnpm format`, `pnpm lint`, full tests/coverage check, and production build.
- [x] Audit every feature against the requested end state. No commit/push requested.

## Verified provider observations

- Token resources include News 168–172, Match Facts 289–292, Predicted Lineups 301–302,
  and Season Brackets 303. Enrichments include trophies 126, news 130–132, facts 154,
  and predicted lineups 157/162. No new access was purchased or changed by this task.
- News feeds are paginated. `lines` contain typed plain-text paragraphs; pre-match lines can
  arrive in reverse order (away before home), so response order is not reading order.
- News accepts `lines;fixture;league`, but nested fixture includes return 400. The sparse fixture
  relationship must remain article context only; writing it into the shared fixture cache erased
  participants and scores. A reproduced regression test now protects that boundary.
- Sample preview fixture: 19735186 (Leverkusen–Union), news 13460, upcoming September 5.
  Sample report fixture: 19732741 (Atlético–Málaga), news 13289.
- `fixtures/19735186?include=predictedLineups.player;predictedLineups.type` returns a
  `predictedlineups` array with formation coordinates and type 111384 / PREDICTED_LINEUP.
- Match-facts fixture endpoint is paginated. Current fields are `participant`, `basis`, `scope`,
  `category`, `data`, `natural_language`, and `type`. Many records have null natural language.
  `streak` is not necessarily consecutive: provider wording may mean X of Y recent matches.
- Fixture 19735186 supplied 633 facts across 13 pages, with 136 written facts. Cache complete
  responses for an hour; do not treat null wording as an empty provider response.
- Coppa Italia 2026/27 season 28279 returns empty bracket stages/edges, despite a complete
  knockout schedule. Stages have type 224 / KNOCK_OUT. Stage sort_order is not chronological
  (Final has sort_order 1); use dates and real progression relationships when arranging rounds.
- Schedule placeholders can contain the same TBC participant ID on both sides. Do not treat
  that shared placeholder ID as a team identity or infer advancement through it.
- Carabao Cup season 25654 nests semi-final legs inside stage `aggregates[].fixtures`. The shared
  schedule parser now retains these matches. Regression tests reproduced the omitted legs and a
  separate advancement bug that skipped an unreported intermediate round before fixing both.
- `trophies.trophy`, `trophies.league`, and `trophies.season` work for Arsenal (19).
  Trophy metadata explicitly identifies Winner (position 1) versus Runner-up (position 2).
- Team, player, and coach honours use `trophies.team` as well. Metadata can be null for inaccessible
  competitions; Mikel Arteta (coach 307) returned an empty trophy array successfully.

## Verification evidence

- Production parsers exercised against the expanded subscription: season bracket and schedule
  25654; predicted lineups, facts, and fixture news 19735186; season previews 28321; the global
  reports feed; honours for Arsenal 19, Erling Haaland 154421, and Mikel Arteta 307.
- Rendered the production routes with these captured responses in an isolated browser preview.
  Checked news filtering and article/fixture navigation, literal match-fact filters, aggregate
  semi-finals and final, player/team honours and placing filters, and the empty coach honours state.
- Confirmed team sheets took precedence in the real fixture response. A controlled preview with
  only those confirmed records removed showed all 22 actual predicted players, explicit prediction
  labelling, and the shared pitch. No predictions entered the confirmed cache.
- Temporary preview source and captured data were removed from the repository after inspection.
  These checks do not claim a packaged native-app end-to-end run.
- Coverage declaration: 43/153 endpoints and 145/1320 includes. Predicted lineup includes are
  covered; standalone prediction endpoints and premium expected lineups remain unshipped.
- Final validation: `pnpm check` and `pnpm build` pass; 487 tests across 115 files. The final
  tracked diff passes whitespace checks, and the work remains uncommitted.

## Primary references

- https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/seasons/get-brackets-by-season-id
- https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/news
- https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/match-facts/get-match-facts-by-fixture-id
- https://www.sportmonks.com/football-api/football-news-api/
