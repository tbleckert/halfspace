# Sportmonks coverage counting rules

The README badge measures the breadth of football data usable in Halfspace. The
[generated report](sportmonks-coverage.md) lists every counted capability, its support evidence,
and the separate endpoint checklist.

## Units and denominator

Start with the official [catalog snapshot](sportmonks-api.json). Count one unit for each returned
data type and one for each unique first-level include on that type. An endpoint with no includes
still contributes its data type. Different retrieval routes do not add units: fixtures by ID,
date, search, and livescore all return fixtures. Nested include combinations add no extra units.

The [capability model](sportmonks-capabilities.json) defines exceptions to the default grouping
by endpoint directory. Bracket includes enrich fixtures, while extended-squad includes enrich
players; neither creates a second copy of those relationships under its documentation category.
Brackets retain their own base capability for the bracket structure.

Distinct data stays separate: pre-match and in-play odds, premium and historical odds, pre-match
and live predictions, player and fixture xG, stage and round statistics, and standing corrections.
The standalone beta team-ranking dataset is not assumed equivalent to the team rankings include.

Aliases merge equivalent capabilities before counting either supported or unsupported data.
For example, the dedicated pre-match odds dataset and `fixtures:odds` are one unit. Implementing
both access paths earns the same credit as implementing one. Aliases must refer to existing
catalog-derived capabilities, with canonical targets; chains and cycles are rejected.

New first-level includes enter the denominator automatically. New endpoints in an existing data
type do not change its weight unless they introduce new includes. Review new endpoint semantics
during catalog refreshes and add an explicit mapping when they introduce a distinct dataset.
Do not exclude unsupported catalog data to improve the percentage.

## Support and equivalents

Existing endpoint/include declarations remain the source of direct support. A capability is
covered when at least one declared access path fetches, caches, and presents that data in context.
First-level support does not promise every statistic type, field, historical window, or possible
nested relationship. These limits apply equally to includes and their alternative queries.

The `equivalents` section of [the declarations](sportmonks-coverage.json) records additional
reviewed queries. Each entry names a capability, all required endpoints/includes, and the product
behavior that proves the relationship. For example, the complete teams-by-season query supplies
`seasons:teams`; the schedule supplies reported stages, rounds, and their fixtures. A broadcaster's
fixture relationship requires both its past and upcoming feeds.

All requirements must remain declared as supported. Removing any requirement removes this source
of credit; equivalences never increase the technical endpoint or endpoint/include counts. Unknown
endpoints, includes, capability keys, or missing rationale fail validation. Equivalences do not
propagate automatically from other equivalences.

Review both the fetcher and its cache/UI consumers before adding evidence. Most entity, schedule,
odds, and commentary fetchers live in [sportmonks.ts](../src/main/sportmonks.ts). Team season
discovery lives in [discovery.ts](../src/main/discovery.ts), and fixture probabilities and expected
metrics in [fixture-analysis.ts](../src/main/fixture-analysis.ts). Their corresponding renderer
features own the usable presentation.

An ID alone does not prove a usable relationship. A team's recent fixtures do not establish a
coach's own match history; fixture lineups do not establish player appearances; current absences
do not establish absence history. Preserve these distinctions when reviewing new mappings.

## Maintenance

After reviewing support or mapping changes, run `pnpm coverage` and commit the generated report
and badge with the declarations and implementation. `pnpm coverage:check` validates their
consistency offline. Coverage tests exercise deduplication, separate data scopes, invalid mappings,
and the removal of equivalent-query credit when a required source is no longer supported.

`pnpm coverage:refresh` refreshes the upstream snapshot and generated artifacts only. It does not
declare new product support or rewrite reviewed mappings. Weekly refresh PRs still require review.

The percentage is a reviewed measure of data breadth. It is not automated proof of UI completeness,
a product-readiness score, or a statement about any token's access or competition-level data.
