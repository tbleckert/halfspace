<p align="center">
  <img src="resources/halfspace-logo.svg" alt="Halfspace logo" width="112" height="112" />
</p>

<h1 align="center">Halfspace</h1>

<p align="center">The open, local-first football workbench.</p>

<p align="center">
  <a href="https://github.com/tbleckert/halfspace/actions/workflows/ci.yml">
    <img src="https://github.com/tbleckert/halfspace/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" />
  </a>
  <a href="docs/sportmonks-coverage.md">
    <img src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Ftbleckert%2Fhalfspace%2Fmain%2F.github%2Fbadges%2Fsportmonks-coverage.json" alt="Sportmonks coverage" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license" />
  </a>
</p>

<p align="center">
  <a href="#run-locally">Run locally</a> ·
  <a href="#roadmap">Roadmap</a> ·
  <a href="#contributing">Contribute</a>
</p>

Follow a match, explore a season, or trace a player's career. Halfspace brings fixtures,
lineups, stats, odds, and connected football profiles into one desktop workspace.

Bring your own Sportmonks token. Fetched data stays on your machine, ready for fast browsing
and available when you're offline.

## Explore the game

- **Follow matchday.** Live scores, upcoming fixtures, and recent results in a rolling calendar.
- **Go inside a match.** Previews, pressure charts, event timelines, pitch lineups, commentary,
  statistics, broadcast listings, and odds.
- **Connect the dots.** Move between competitions, teams, players, coaches, referees, and venues.
  Explore season statistics, squads, leaderboards, and transfer histories along the way.

## Run locally

You'll need Node.js 22.12 or newer, pnpm 11.1.2, and your own Sportmonks Football API token.

```sh
git clone https://github.com/tbleckert/halfspace.git
cd halfspace
pnpm install
pnpm dev
```

Add your token when the app opens. Available leagues and data depend on your Sportmonks plan
and add-ons. Settings shows what your token can access; an included feature may still have no
data for a particular league or fixture.

## Roadmap

The north star is complete Sportmonks Football coverage: every endpoint and every supported
include should have a useful place in Halfspace.

### Available

- [x] Local-first desktop app with personal Sportmonks tokens and offline browsing.
- [x] Matchday hub with calendar navigation, live updates, upcoming fixtures, and recent results.
- [x] Global live-score ticker with direct links into every match in play.
- [x] Competition pages with standings, qualification and relegation places, linked form, season selection, and complete season team lists.
- [x] Complete season schedules with stage and round navigation.
- [x] Knockout brackets with two-leg ties, aggregate results, and tournament progression.
- [x] Round-by-round league tables with season selection and offline history.
- [x] Live league tables with in-play standings and automatic updates.
- [x] Team pages with current competitions, fixtures, squad profiles, and transfer history.
- [x] Transfer hub with latest updates, date ranges, paginated browsing, and linked player and club profiles.
- [x] Historical team squads with season selection and offline browsing.
- [x] Current team injuries and suspensions with linked player profiles.
- [x] Team rivalries with direct links to rival clubs.
- [x] Team rankings with reported ranking systems, positions, and points.
- [x] Referee profiles and recent match appointments, linked from fixture officials.
- [x] Referee season statistics with reported disciplinary totals and per-match averages.
- [x] Player pages with match records and career history, plus coach and venue profiles.
- [x] Team, player, and coach honours with competition, season, club, and reported placing.
- [x] Season statistics for competitions, teams, and players.
- [x] Cross-league team and player comparisons with entity-specific season selection, independent records, and per-90 player radars.
- [x] Season player leaderboards for goals, assists, yellow cards, and red cards.
- [x] Fixture previews, event timelines, pitch lineups, match statistics, and pre-match odds.
- [x] Fixture weather and match-specific absences with linked player profiles.
- [x] Match facts with team, category, and scope filters in fixture previews.
- [x] Predicted lineups on the shared pitch before confirmed team sheets are available.
- [x] Football news with competition and season browsing, article readers, and fixture previews and reports.
- [x] Match-aware Game view combining pressure, key statistics, and the event timeline.
- [x] Fixture pressure charts with goal and red-card markers, exact values, and live updates.
- [x] Match trends for possession, shots, shots on target, and corners, with period selection and live updates.
- [x] Live match commentary with key-event filtering and offline history.
- [x] Fixture Preview TV guides with country-specific broadcast listings.
- [x] Broadcaster pages with paginated upcoming and past schedules and match-specific broadcast regions.
- [x] Competition Team of the Week with season and round browsing.
- [x] Pre-match and in-play odds explorer with market and bookmaker comparison.
- [x] Subscription overview showing plans, add-ons, and feature access for your token.
- [x] Global search across matches and football profiles, including referees, with cached results.
- [x] Competition quick access and navigation prefetching.

### Ahead

Prioritize football data presentation, then dedicated design passes. Sharing and image exports
follow once the visual design is settled.

- [ ] Complete referee appointment history beyond the recent six-month window.
- [ ] Transfer rumours and pending transfers.
- [ ] Expected goals, predictions, and expected lineups.
- [ ] Deeper in-play analysis.
- [ ] Premium odds and deeper bookmaker coverage.
- [ ] Deeper comparison and analysis tools built on the local data foundation.
- [ ] Dedicated design passes across football views.
- [ ] Shareable image exports of comparisons and other football views for social media.
- [ ] Complete Sportmonks endpoint and include coverage.

Checked items describe the features available today, not exhaustive API coverage. Every addition
should stay local-first, with typed requests, durable caching, and natural links between entities.

An endpoint or include is considered covered when its data can be fetched safely, cached locally,
reached through the interface, and understood in the context of the related entities.

[Track endpoint and include coverage.](docs/sportmonks-coverage.md)

## Development

Built with **Electron**, **React + TypeScript**, **shadcn/ui + Tailwind**, **TanStack Router**, and
**Dexie/IndexedDB**, with electron-vite for development and builds.

Electron's main process handles token storage and Sportmonks requests. The renderer reads cached
football data from IndexedDB and refreshes it in the background.

Run `pnpm check` for type checks, tests, lint, formatting, and coverage validation.
Run `pnpm build` for a production build.

### Sportmonks coverage

When shipping endpoint or include support, update `docs/sportmonks-coverage.json` and run
`pnpm coverage`. Commit the generated report and badge alongside the implementation. CI runs
`pnpm check` and `pnpm build` on pull requests and pushes to `main`, rejecting stale coverage
artifacts. The README badge reads the generated file on `main`.

The **Refresh Sportmonks catalog** workflow checks the official documentation every Monday at
05:17 UTC and can also be run manually from Actions. Changes open or update one draft PR with
the upstream catalog, report, and badge; declared product support is never changed automatically.
If upstream changes invalidate a declaration, the workflow fails for manual review.

The refresh needs **Settings → Actions → General → Allow GitHub Actions to create and approve
pull requests** enabled. It uses the built-in `GITHUB_TOKEN`; no Sportmonks token or personal
access token is needed. The workflow does not approve or merge PRs.

Review the draft and mark it **Ready for review** to trigger PR checks. GitHub does not trigger
CI when its built-in token creates or updates a PR, so the refresh runs checks and builds before
opening it. Later updates return the PR to draft. The badge updates after the PR is merged,
subject to GitHub and Shields caching.

## Contributing

Bug reports, football use cases, and focused pull requests are welcome. Pick something from the
roadmap or open an issue to discuss a larger change. Keep cached browsing fast, link related
entities, and run `pnpm check` before submitting your work.

## License

[MIT](LICENSE).
