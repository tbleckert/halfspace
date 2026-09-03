# Maintenance review — 2026-09-03

Scope: review the existing application for maintainability, shared UI/theme use, bugs,
performance, and offline-first behavior. No new football features or visual redesign.

## Findings addressed

| Area                 | Changes                                                                                                                                                                       | Evidence                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maintainability      | Consolidated main-process request handling and renderer refresh status; separated fixture subviews from their persistent shell; isolated sidebar warming.                     | Type checks and lint pass. Fixture, team, competition, and player route tests retain the shared shell.                                              |
| Shared UI and theme  | Search uses the shared Dialog/Command primitives. Fixture panels reuse Card. Football states, pitch, portraits, overlays, and sidebar colors use semantic theme tokens.       | Search keyboard/focus tests; component/style inspection; native app checks of competition, search, fixture timeline, lineups, statistics, and odds. |
| Request correctness  | Entity-scoped rate-limit cooldowns; no silently successful truncated fixture pagination; query-scoped loading/errors; chronological timeline sorting.                         | Reproduced failures before fixes, including wrong-page errors, ignored cooldowns, incomplete pagination, and out-of-order events.                   |
| Offline cache safety | Preserve richer identities and newer fixture snapshots. Scope live-query results to their entity/date/season. Read, merge, and replace cache records in one transaction.      | Real Dexie/fake-indexeddb tests for stale responses, concurrent detail hydration, squad separation, and obsolete odds removal.                      |
| Background work      | Bounded stale-query retries, hidden/offline pause, stale-only reconnect refresh, cancellable hover and sidebar queues.                                                        | Timer, visibility, connectivity, rerender, and unmount tests.                                                                                       |
| Credential lifecycle | Invalidate pending search/refresh work, reset the mounted workspace, gate it during cache clearing, surface reset failures with retry, and reject stale rate-limit snapshots. | Credential flow and deferred-response tests. The real stored token was not changed during verification.                                             |

## Performance check

The previous odds cleanup repeatedly searched an array for every cached ID. Set membership
keeps that operation linear. A local synthetic comparison over 20,000 IDs returned identical
results in approximately 1.3 ms with a Set versus 36 ms with array membership. This measures
the cleanup operation, not end-to-end UI latency.

Existing query deduplication, cache expiry windows, lazy odds/commentary payloads, normalized
entity tables, and persistent route shells remain in place. No duplicate football-data cache
or speculative compatibility layer was added.

## Verification

- `pnpm check`: 271 tests across 53 files, TypeScript, ESLint, formatting, and API coverage checks.
- `pnpm build`: main, preload, and renderer production bundles plus TypeScript checks.
- `git diff --check`: clean.
- Native Electron smoke checks confirmed the retained layout and corrected timeline order.
- `AGENTS.md` records the cache transaction, query identity, refresh status, and credential-reset rules.

This is a maintenance review of the current product, not a claim that every possible provider
response or operating-system failure is covered. Credential/storage failure cases use controlled
test doubles; release packaging on other operating systems was not exercised.
