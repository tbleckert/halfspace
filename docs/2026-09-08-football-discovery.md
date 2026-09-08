# Football discovery coverage

This pass adds three browsing features using endpoints verified against the current subscription:

- Players: a main-nav directory with immediate cached search, paginated provider search, country
  browsing, and linked player cards. Country and nationality remain distinct. The provider's
  lowercase `detailedposition` response is normalized to the typed detailed position field.
- Competitions: country selection backed by the complete country league feed, with current-season
  context. Country query membership stays separate from the subscribed catalog.
- Team Seasons: all reported seasons grouped by competition, with links carrying the exact season
  and a date inside it. Historical participation does not establish current competition membership.

Each query has a daily local cache, uses the shared main-process client and typed preload API, and
participates in credential-reset invalidation. Player pages retain explicit `hasMore`; country league
feeds consume every page before caching. Shared identities retain richer and newer details. Later fixture and leaderboard hydration also
retains player-directory enrichments, even before a full player profile has been opened.

The team season endpoint is non-paginated, as documented in the
[official endpoint reference](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/seasons/get-seasons-by-team-id).
Season links also expose a previous navigation bug: a season outside the usual ten recent choices
could fall back to the newest season. Selectors now retain an explicitly linked older season, and
competition queries never substitute a different season for an unknown requested ID.

## Verified on 8 September 2026

The production readers successfully loaded:

- 50 players with another page available, both globally and for country 47 (Sweden).
- 50 search results for Alexander, with another page available.
- Allsvenskan and Superettan through the Sweden competition endpoint.
- Arsenal's 96 reported team-season records in one non-paginated response.

The running Electron app was checked for player cards, Sweden filtering and page two, Sweden's two
competitions, Arsenal's grouped season history, and a 2016/17 Premier League link that retained the
selected season and displayed its reported table. Country choices use countries already discovered
in the shared cache. Records returned by the player directory can include retired players and coaches;
Halfspace preserves the reported identity and role without inferring an active playing career.

Validation covers pagination and relationship mismatches, rejected partial lists, access denial,
query isolation, newer/richer cache preservation, credential reset and concurrent requests, and older
season selection. All 734 tests pass, alongside TypeScript, lint, formatting, coverage checks, and
the production build.

## Coverage

| Measure        |     Before |      After |
| -------------- | ---------: | ---------: |
| Endpoints      |   63 / 153 |   67 / 153 |
| Includes       | 216 / 1320 | 228 / 1320 |
| Combined badge |        19% |        20% |

The four new endpoints are all players, players by country, leagues by country, and seasons by team.
The existing player search endpoint also gains the country include. The
[README roadmap](../README.md) and [coverage report](sportmonks-coverage.md) reflect the usable scope.
