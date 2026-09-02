# Sportmonks API coverage

Halfspace currently covers **25 of 153 endpoints** and **80 of 1320 documented endpoint includes**.

Overall coverage: **7%**

Source: [Sportmonks Football API 3.0 documentation index](https://docs.sportmonks.com/v3/sitemap.md)

The [catalog snapshot](sportmonks-api.json) lists every endpoint and supported top-level include in the Football API documentation, including odds. Other Sportmonks APIs and all possible nested include combinations are outside this count.

Coverage means the endpoint or include is fetched, cached locally, reachable in the interface, and presented in its football context. Nested includes count through their documented top-level include.

The percentage counts one unit per endpoint and per endpoint/include pair. It tracks reviewed product coverage, not automated proof of UI completeness or subscription access. Declarations live in `docs/sportmonks-coverage.json`.

Update the declarations as features ship, then run `pnpm coverage` to regenerate the report and badge. Run `pnpm coverage:refresh` to download the latest catalog from the public documentation; no API token is needed. `pnpm coverage:check` validates declarations and generated files offline and is part of `pnpm check`.

The README badge reads the generated JSON from the default branch on GitHub and updates after those changes are pushed.

## Endpoints

### Livescores

- [ ] [Inplay Livescores](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/livescores/get-inplay-livescores)
- [ ] [All Livescores](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/livescores/get-all-livescores)
- [ ] [Latest Updated Livescores](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/livescores/get-latest-updated-livescores)

### Fixtures

- [ ] [All Fixtures](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-all-fixtures)
- [x] [Fixture by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-fixture-by-id) — includes 13/38
- [ ] [Fixtures by Multiple IDs](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-fixtures-by-multiple-ids)
- [x] [Fixtures by Date](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-fixtures-by-date) — includes 5/38
- [x] [Fixtures by Date Range](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-fixtures-by-date-range) — includes 5/38
- [x] [Fixtures by Date Range for Team](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-fixtures-by-date-range-for-team) — includes 6/38
- [x] [Fixtures by Head To Head](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-fixtures-by-head-to-head) — includes 5/38
- [ ] [Fixtures by Search by Name](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-fixtures-by-search-by-name)
- [ ] [Upcoming Fixtures by Market ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-upcoming-fixtures-by-market-id)
- [ ] [Upcoming Fixtures by TV Station ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-upcoming-fixtures-by-tv-station-id)
- [ ] [Past Fixtures by TV Station ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-past-fixtures-by-tv-station-id)
- [ ] [Latest Updated Fixtures](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-latest-updated-fixtures)

### States

- [ ] [All States](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/states/get-all-states)
- [ ] [State by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/states/get-state-by-id)

### Types

- [ ] [All Types](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/types/get-all-types)
- [ ] [Type by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/types/get-type-by-id)
- [ ] [Type by Entity](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/types/get-type-by-entity)

### Leagues

- [x] [All Leagues](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/leagues/get-all-leagues) — includes 2/9
- [ ] [League by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/leagues/get-league-by-id)
- [ ] [Leagues by Live](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/leagues/get-leagues-by-live)
- [ ] [Leagues by Fixture Date](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/leagues/get-leagues-by-fixture-date)
- [ ] [Leagues by Country ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/leagues/get-leagues-by-country-id)
- [x] [Leagues Search by Name](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/leagues/get-leagues-search-by-name) — includes 2/9
- [ ] [All Leagues by Team ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/leagues/get-all-leagues-by-team-id)
- [ ] [Current Leagues by Team ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/leagues/get-current-leagues-by-team-id)

### Seasons

- [x] [All Seasons](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/seasons/get-all-seasons) — includes 0/9
- [x] [Seasons by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/seasons/get-seasons-by-id) — includes 1/9
- [ ] [Seasons by Team ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/seasons/get-seasons-by-team-id)
- [ ] [Seasons by Search by Name](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/seasons/get-seasons-by-search-by-name)
- [ ] [Brackets by Season ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/seasons/get-brackets-by-season-id)

### Statistics

- [ ] [Season Statistics by Participant](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/statistics/get-season-statistics-by-participant)
- [ ] [Stage Statistics by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/statistics/get-stage-statistics-by-id)
- [ ] [Round Statistics by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/statistics/get-round-statistics-by-id)

### Schedules

- [ ] [Schedules by Season ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/schedules/get-schedules-by-season-id)
- [ ] [Schedules by Team ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/schedules/get-schedules-by-team-id)
- [ ] [Schedules by Season ID and Team ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/schedules/get-schedules-by-season-id-and-team-id)

### Stages

- [ ] [All Stages](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/stages/get-all-stages)
- [ ] [Stage by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/stages/get-stage-by-id)
- [ ] [Stages by Season ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/stages/get-stages-by-season-id)
- [ ] [Stages by Search by Name](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/stages/get-stages-by-search-by-name)

### Rounds

- [ ] [All Rounds](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/rounds/get-all-rounds)
- [ ] [Round by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/rounds/get-round-by-id)
- [ ] [Rounds by Season ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/rounds/get-rounds-by-season-id)
- [ ] [Rounds by Search by Name](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/rounds/get-rounds-by-search-by-name)

### Standings

- [ ] [All Standings](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standings/get-all-standings)
- [x] [Standings by Season ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standings/get-standings-by-season-id) — includes 3/10
- [ ] [Standings by Round ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standings/get-standings-by-round-id)
- [ ] [Standing Correction by Season ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standings/get-standing-correction-by-season-id)
- [ ] [Live Standings by League ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standings/get-live-standings-by-league-id)
- [ ] [Grouped Standings by Round ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standings/get-grouped-standings-by-round-id)

### Topscorers

- [x] [Topscorers by Season ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/topscorers/get-topscorers-by-season-id) — includes 3/4
- [ ] [Topscorers by Stage ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/topscorers/get-topscorers-by-stage-id)

### Teams

- [ ] [All Teams](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/teams/get-all-teams)
- [x] [Team by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/teams/get-team-by-id) — includes 5/16
- [ ] [Teams by Country ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/teams/get-teams-by-country-id)
- [ ] [Teams by Season ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/teams/get-teams-by-season-id)
- [x] [Teams by Search by Name](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/teams/get-teams-by-search-by-name) — includes 2/16

### Players

- [ ] [All Players](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/players/get-all-players)
- [x] [Player by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/players/get-player-by-id) — includes 4/14
- [ ] [Players by Country ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/players/get-players-by-country-id)
- [x] [Players by Search by Name](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/players/get-players-by-search-by-name) — includes 3/14
- [ ] [Last Updated Players](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/players/get-last-updated-players)

### Team Squads

- [x] [Team Squad by Team ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/team-squads/get-team-squad-by-team-id) — includes 3/5
- [ ] [Extended Team Squad by Team ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/team-squads/get-extended-team-squad-by-team-id)
- [x] [Team Squad by Team and Season ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/team-squads/get-team-squad-by-team-and-season-id) — includes 2/5

### Match Facts

- [ ] [All available Match Facts](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/match-facts/get-all-available-match-facts)
- [ ] [Match Facts by fixture ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/match-facts/get-match-facts-by-fixture-id)
- [ ] [Match Facts by date range](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/match-facts/get-match-facts-by-date-range)
- [ ] [Match Facts by league ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/match-facts/get-match-facts-by-league-id)

### Team Rankings - beta

- [ ] [All Team Rankings](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/team-rankings-beta/get-all-team-rankings)
- [ ] [Team Rankings by Team ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/team-rankings-beta/get-team-rankings-by-team-id)
- [ ] [Team Rankings by date](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/team-rankings-beta/get-team-rankings-by-date)

### Team of the Week (TOTW)

- [ ] [All available TOTWs](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/team-of-the-week-totw/get-all-available-totws)
- [ ] [TOTW per round](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/team-of-the-week-totw/get-totw-per-round)
- [ ] [Latest TOTW](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/team-of-the-week-totw/get-latest-totw)

### Coaches

- [ ] [All Coaches](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/coaches/get-all-coaches)
- [x] [Coach by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/coaches/get-coach-by-id) — includes 2/9
- [ ] [Coaches by Country ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/coaches/get-coaches-by-country-id)
- [x] [Coaches Search by Name](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/coaches/get-coaches-search-by-name) — includes 1/9
- [ ] [Last Updated Coaches](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/coaches/get-last-updated-coaches)

### Referees

- [ ] [All Referees](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/referees/get-all-referees)
- [x] [Referee by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/referees/get-referee-by-id) — includes 2/6
- [ ] [Referees by Country ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/referees/get-referees-by-country-id)
- [ ] [Referees by Season ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/referees/get-referees-by-season-id)
- [ ] [Referees Search by Name](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/referees/get-referees-search-by-name)

### Transfers

- [ ] [All Transfers](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/transfers/get-all-transfers)
- [ ] [Transfer by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/transfers/get-transfer-by-id)
- [ ] [Latest Transfers](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/transfers/get-latest-transfers)
- [ ] [Transfers Between Date Range](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/transfers/get-transfers-between-date-range)
- [x] [Transfers by Team ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/transfers/get-transfers-by-team-id) — includes 4/7
- [x] [Transfers by Player ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/transfers/get-transfers-by-player-id) — includes 3/7

### Transfer rumours

- [ ] [All Transfers Rumours](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/transfer-rumours/get-all-transfers-rumours)
- [ ] [Transfer Rumours by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/transfer-rumours/get-transfer-rumours-by-id)
- [ ] [Transfers Rumours Between Date Range](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/transfer-rumours/get-transfers-rumours-between-date-range)
- [ ] [Transfer Rumours by Team ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/transfer-rumours/get-transfer-rumours-by-team-id)
- [ ] [Transfer Rumours by Player ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/transfer-rumours/get-transfer-rumours-by-player-id)

### Venues

- [ ] [All Venues](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/venues/get-all-venues)
- [x] [Venue by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/venues/get-venue-by-id) — includes 1/3
- [ ] [Venues by Season ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/venues/get-venues-by-season-id)
- [x] [Venues by Search by Name](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/venues/get-venues-by-search-by-name) — includes 1/3

### TV Stations

- [ ] [All TV Stations](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/tv-stations/get-all-tv-stations)
- [ ] [TV Station by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/tv-stations/get-tv-station-by-id)
- [ ] [TV Stations by Fixture ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/tv-stations/get-tv-stations-by-fixture-id)

### Expected (xG)

- [ ] [Expected by Team](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/expected-xg/get-expected-by-team)
- [ ] [Expected by Player](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/expected-xg/get-expected-by-player)

### Premium Expected Lineups

- [ ] [Expected Lineup by Team](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/premium-expected-lineups/get-expected-lineup-by-team)
- [ ] [Expected Lineups by Player](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/premium-expected-lineups/get-expected-lineups-by-player)

### Predictions

- [ ] [Probabilities](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/predictions/get-probabilities)
- [ ] [Predictability by League ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/predictions/get-predictability-by-league-id)
- [ ] [Probabilities by Fixture ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/predictions/get-probabilities-by-fixture-id)
- [ ] [Value Bets](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/predictions/get-value-bets)
- [ ] [Value Bets by Fixture ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/predictions/get-value-bets-by-fixture-id)
- [ ] [Live Probabilities by Fixture ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/predictions/get-live-probabilities-by-fixture-id)
- [ ] [Live Probabilities](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/predictions/get-live-probabilities)

### Standard Odds Feed / Pre-match Odds

- [ ] [All Odds](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standard-odds-feed/pre-match-odds/get-all-odds)
- [x] [Odds by Fixture ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standard-odds-feed/pre-match-odds/get-odds-by-fixture-id) — includes 2/3
- [ ] [Odds by Fixture ID and Bookmaker ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standard-odds-feed/pre-match-odds/get-odds-by-fixture-id-and-bookmaker-id)
- [ ] [Odds by Fixture ID and Market ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standard-odds-feed/pre-match-odds/get-odds-by-fixture-id-and-market-id)
- [ ] [Last Updated Odds](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standard-odds-feed/pre-match-odds/get-last-updated-odds)

### Standard Odds Feed / Inplay Odds

- [ ] [All Inplay Odds](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standard-odds-feed/inplay-odds/get-all-inplay-odds)
- [ ] [Inplay Odds by Fixture ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standard-odds-feed/inplay-odds/get-inplay-odds-by-fixture-id)
- [ ] [Inplay Odds by Fixture ID and Bookmaker ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standard-odds-feed/inplay-odds/get-inplay-odds-by-fixture-id-and-bookmaker-id)
- [ ] [Inplay Odds by Fixture ID and Market ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standard-odds-feed/inplay-odds/get-inplay-odds-by-fixture-id-and-market-id)
- [ ] [Last Updated Inplay Odds](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standard-odds-feed/inplay-odds/get-last-updated-inplay-odds)

### Premium Odds Feed / Premium Pre-match Odds

- [ ] [All Premium Odds](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/premium-odds-feed/premium-pre-match-odds/get-all-premium-odds)
- [ ] [Premium Odds by Fixture ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/premium-odds-feed/premium-pre-match-odds/get-premium-odds-by-fixture-id)
- [ ] [Premium Odds by Fixture ID and Bookmaker ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/premium-odds-feed/premium-pre-match-odds/get-premium-odds-by-fixture-id-and-bookmaker-id)
- [ ] [Premium Odds by Fixture ID and Market ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/premium-odds-feed/premium-pre-match-odds/get-premium-odds-by-fixture-id-and-market-id)
- [ ] [Updated Premium Odds Between Time Range](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/premium-odds-feed/premium-pre-match-odds/get-updated-premium-odds-between-time-range)
- [ ] [Updated Historical Odds Between Time Range](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/premium-odds-feed/premium-pre-match-odds/get-updated-historical-odds-between-time-range)
- [ ] [All Historical Odds](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/premium-odds-feed/premium-pre-match-odds/get-all-historical-odds)

### Markets

- [ ] [All Markets](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/markets/get-all-markets)
- [ ] [All Premium Markets](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/markets/get-all-premium-markets)
- [ ] [Market by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/markets/get-market-by-id)
- [ ] [Market by Search](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/markets/get-market-by-search)

### Bookmakers

- [ ] [All Bookmakers](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/bookmakers/get-all-bookmakers)
- [ ] [All Premium Bookmakers](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/bookmakers/get-all-premium-bookmakers)
- [ ] [Bookmaker by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/bookmakers/get-bookmaker-by-id)
- [ ] [Bookmaker by Search](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/bookmakers/get-bookmaker-by-search)
- [ ] [Bookmaker by Fixture ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/bookmakers/get-bookmaker-by-fixture-id)
- [ ] [Bookmaker Match ID Mappings by Fixture ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/bookmakers/get-bookmaker-match-id-mappings-by-fixture-id)

### News

- [ ] [Pre-Match News](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/news/get-pre-match-news)
- [ ] [Pre-Match News by Season ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/news/get-pre-match-news-by-season-id)
- [ ] [Pre-Match News for Upcoming Fixtures](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/news/get-pre-match-news-for-upcoming-fixtures)
- [ ] [Post-Match News](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/news/get-post-match-news)
- [ ] [Post-Match News by Season ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/news/get-post-match-news-by-season-id)

### Rivals

- [ ] [All Rivals](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/rivals/get-all-rivals)
- [ ] [Rivals by Team ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/rivals/get-rivals-by-team-id)

### Commentaries

- [ ] [All Commentaries](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/commentaries/get-all-commentaries)
- [ ] [Commentaries by Fixture ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/commentaries/get-commentaries-by-fixture-id)
