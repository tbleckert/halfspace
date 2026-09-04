# Live football data pass

## Delivery checklist

- [x] Live competition tables: URL-backed live/current/round selection; separate current-season
      live snapshots, provider standings and rules, visible snapshot time, and bounded live refresh.
- [x] Match trends: Game view charts for reported possession, shots, shots on target, and corners;
      distinct periods, original values and missing readings, fixture-scoped lazy cache and refresh.
- [x] Broadcaster schedules: fixture TV guide links to broadcaster pages, upcoming/past feeds,
      explicit pagination, fixture-specific broadcast regions, and shared fixture cache hydration.

## Completion gates

- [x] Provider boundary, cache identity, stale response, credential reset, and navigation tests.
- [x] Live response replay and route interaction tests for all three features.
- [x] README, AGENTS.md, coverage declarations, report, and badge reflect shipped scope.
- [x] Typecheck, format, lint, tests, coverage check, production build, and final diff review.

## Provider observations

- Live standings are non-paginated and require an active league stage. An empty response is not
  evidence of denied access. Validate both league and season before saving a snapshot.
- The fixture `trends` include returns period, minute, participant, statistic type, and value.
  Keep periods separate so added-time readings cannot overlap the next half.
- Broadcaster upcoming and past fixture endpoints are paginated. A station's general countries
  do not prove where a fixture airs; retain fixture-specific broadcast regions.

## Validation

- Captured provider responses passed the production parsers: 20 live table rows, filtered match
  trends with two reported periods, and 25 Viaplay fixtures with explicit pagination and regions.
- Native visual checks confirmed the live table, active-match markers, snapshot time, and match
  trends. Route tests cover broadcaster navigation, both feeds, pagination, offline data, identity
  changes, and return context.
- Full suite: 540 tests across 126 files. Typecheck, format, lint, production build, coverage check,
  and diff review passed.
- Coverage: 48 of 153 endpoints and 169 of 1320 includes.

No publication or subscription changes are part of this pass.
