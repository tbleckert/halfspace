# Five football analysis features

This pass adds five usable features, with subscription access and competition coverage kept
separate. An empty response does not imply that an upgrade is required.

1. Fixture Stats shows reported xG, xG on target, non-penalty xG, and expected points.
2. Fixture Preview shows result, both-teams-to-score, over/under 2.5, and correct-score probabilities.
3. Fixture Lineups offers expected starting XIs and benches alongside the existing Predicted XI.
   Confirmed team sheets take precedence; forecasts never become appearances or performance data.
4. Fixture Stats offers URL-backed period selection, including first and second halves.
5. Team comparisons offer independent home/away selections that follow their teams when swapped.

The four fixture feeds use separate local caches, typed IPC, shared authentication and rate-limit
handling, and credential-reset invalidation. Period statistics resolve home/away from participant
metadata because the provider does not attach a location to those records. Missing splits and
unavailable periods never borrow full-match or season totals.

## Verification

- Feature access was verified separately from competition coverage. Basic xG does not establish
  live xG access.
- Production parsers accepted four prediction categories, 41 expected squad entries, all four
  expected metrics, and 72 first-half plus 76 second-half statistic records.
- The running Electron app was checked with Barcelona–Feyenoord's expected XIs and benches,
  Club Brugge–Aston Villa's predictions and confirmed lineup precedence, AEK–Levski's expected
  metrics, Ipswich–Liverpool's half statistics and empty xG state, and Arsenal/Liverpool splits.
- All 718 tests, TypeScript, ESLint, formatting, coverage checks, and the production build pass.

Supported coverage increases from 62 to 63 endpoints and from 213 to 216 includes. The combined
badge remains 19%. Period statistics and home/away comparisons deepen already-counted endpoints.
The [README roadmap](../README.md) and [coverage report](sportmonks-coverage.md) reflect this scope.
