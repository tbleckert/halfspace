# Halfspace

The open, local-first football workbench.

[![Sportmonks coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Ftbleckert%2Fhalfspace%2Fmain%2F.github%2Fbadges%2Fsportmonks-coverage.json)](docs/sportmonks-coverage.md)

Halfspace runs on your machine, uses your own Sportmonks token, and keeps fetched football
data available locally for fast browsing and inspection.

## Roadmap

The north star is complete Sportmonks Football coverage: every endpoint and every supported
include should have a useful place in Halfspace.

### Available

- [x] Local-first desktop app with personal Sportmonks tokens and offline browsing.
- [x] Matchday hub with calendar navigation, live updates, upcoming fixtures, and recent results.
- [x] Competition pages with standings, fixtures, teams, and season selection.
- [x] Complete season schedules with stage and round navigation.
- [x] Team pages with fixtures, squad profiles, and transfer history.
- [x] Historical team squads with season selection and offline browsing.
- [x] Current team injuries and suspensions with linked player profiles.
- [x] Team rivalries with direct links to rival clubs.
- [x] Referee profiles and recent match appointments, linked from fixture officials.
- [x] Player pages with match records and career history, plus coach and venue profiles.
- [x] Season statistics for competitions, teams, and players.
- [x] Season player leaderboards for goals, assists, yellow cards, and red cards.
- [x] Fixture previews, event timelines, pitch lineups, match statistics, and pre-match odds.
- [x] Live match commentary with key-event filtering and offline history.
- [x] Fixture TV guides with country-specific broadcast listings.
- [x] Competition Team of the Week with season and round browsing.
- [x] Pre-match and in-play odds explorer with market and bookmaker comparison.
- [x] Subscription overview showing plans, add-ons, and feature access for your token.
- [x] Global entity search, competition quick access, and navigation prefetching.

### Ahead

- [ ] Knockout brackets and tournament progression.
- [ ] Team rankings.
- [ ] Referee season statistics and deeper match history.
- [ ] Transfer rumours and pending transfers.
- [ ] Expected goals, predictions, and expected lineups.
- [ ] Match facts and deeper in-play analysis.
- [ ] Football news.
- [ ] Premium odds and deeper bookmaker coverage.
- [ ] Comparison and analysis tools built on the local data foundation.
- [ ] Complete Sportmonks endpoint and include coverage.

Checked items describe the features available today, not exhaustive API coverage. Every addition
should stay local-first, with typed requests, durable caching, and natural links between entities.

Data availability depends on your Sportmonks plan, add-ons, selected leagues, and the individual
fixture. Settings shows what your token can access; an included feature may still have no data for
a particular selection.

An endpoint or include is considered covered when its data can be fetched safely, cached locally,
reached through the interface, and understood in the context of the related entities.

[Track endpoint and include coverage.](docs/sportmonks-coverage.md)

## Development

```sh
pnpm install
pnpm dev
```

Run `pnpm check` before submitting changes.
