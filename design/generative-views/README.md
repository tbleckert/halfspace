# Generative Views: three north-star studies

These are accepted interactive design targets for Halfspace's generative Views. The study itself
uses example data; track working and planned widgets in the [widget inventory](../../docs/view-widgets.md).
Open [the study](index.html)
directly in a browser, or serve the repository locally and visit `/design/generative-views/`.
No packages, API keys, build step or network data are required.

All fixtures, prices, statistics, news and player profiles are hand-authored examples. Team and
club names provide recognizable context; no current football facts are asserted. The player
shortlist uses fictional identities. The canonical Halfspace logo is reused from `resources/`.

## The three stories

| Story              | User request                                   | Composition                                                                                                                   | Quality question                                                                              |
| ------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Supporter          | Build a personal home for Arsenal.             | Next match first; season snapshot; calendar, standings and team news; recent home results and editorial context.              | Can I understand my team's situation in ten seconds and open the next useful detail?          |
| Betting researcher | Find weekend matches worth investigating.      | A market shortlist linked to supporting and contradictory evidence, like-for-like prices and explicit probability provenance. | Can I trace why a match surfaced and identify what remains unknown?                           |
| Analyst            | Compare three forwards and refine a shortlist. | Compact player identities, aligned per-90 metrics, playing-time context and inspectable totals.                               | Can I explain the differences without losing the scope or confusing sample size with quality? |

## Review the interaction, not just the screenshot

Use the controls above the workspace to select a story and examine these states:

1. **Initial request:** the exact prompt behind the example. Opening the composition is immediate
   and explicitly scripted; no generation, streaming or progress is simulated.
2. **Composed view:** the initial answer. Open details, select another betting candidate or change
   the player selection. The betting panels and player comparisons update together.
3. **After follow-up:** match preparation moves to the top of the supporter home; betting research
   narrows to home wins; the player shortlist requires at least 1,500 league minutes.
4. **Missing data:** broadcast listings become unavailable; probabilities and dependent gaps become
   unknown while prices remain; Silva's missing chance-creation rate has no fabricated zero bar.
5. **Narrow window:** the canvas reflows according to available content width. A physical browser
   resize also works. At phone widths, the application sidebar disappears.
6. **Edit layout:** try one-, two- and three-column spans. Widget internals adapt to their actual
   available width; at smaller widths the grid clamps to two or one columns.
7. **Save view:** save the example's settings in this browser and reload its story URL to restore
   them. This uses a study-specific localStorage key, separate from Halfspace's application data.

The top controls and story brief belong to the review harness. The workspace sidebar is visual
context; its main-app destinations are not presented as functioning links. Example view links,
detail dialogs, selection controls, filters and saves are functional.

## What the examples suggest about widgets

The library should grow from shared data and useful presentation contracts. These studies suggest
the following families. Every production widget must support all three column modes.

| Family               | Seen in                    | Configuration and width behavior                                                                       |
| -------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Fixture summary      | Supporter, research detail | Fixture identity, date/time zone, local team context; horizontal at wide sizes, stacked when narrow.   |
| Fixture list         | Supporter                  | Team/date window; compact time, opponent and context.                                                  |
| Standings            | Supporter                  | Competition/season, team highlight, explicit preview limit; extra columns appear when room permits.    |
| Statistic summary    | Supporter, analyst         | Entity/context, selected metrics and units; compact aligned values.                                    |
| Player profile       | Analyst, team news         | Identity, season/club context, minutes and selection state.                                            |
| Comparison           | Analyst                    | Explicit entities and scopes, shared scales per metric, deterministic calculations and missingness.    |
| Market shortlist     | Researcher                 | Date/market filter, selected fixture, quote freshness, probability source and gap definition.          |
| Price comparison     | Researcher                 | Exact fixture, market, outcome, line and settlement; active quotes only.                               |
| Context and evidence | All three                  | Reported absences, sourced editorial or deterministic observations; connected to the active selection. |
| Trend                | Supporter                  | Defined match sample, reported values, labeled units and order.                                        |

The supporter follow-up changes hierarchy. The research follow-up changes scope and selection.
The analyst follow-up changes membership. Supporting those three kinds of changes is a more
useful benchmark than reaching a particular widget count.

## Boundaries to verify before implementation

- Reuse the existing typed queries and focused presentation components for fixtures, standings,
  absences, TV, odds and comparisons. Extend the declarative View definition to express team,
  player, fixture and comparison contexts intentionally.
- These mockups do not check live Sportmonks entitlement or coverage. Source availability must be
  verified before committing to a provider-dependent widget. Never infer access from an empty feed.
- The research gap is `illustrative probability − 1 / decimal price`, expressed in percentage
  points. It is not a margin-free market probability, measured edge or profitability claim.
  Real implementation requires verified model semantics, outcome alignment, freshness and an
  honest representation of calibration and uncertainty. No real prediction model is connected.
- Per-90 figures are totals divided by minutes times 90, rounded for display. The sample has no
  league-strength adjustment. Confirm each provider metric's meaning, especially chance creation.
- Chart and narrative observations in this study are deterministic. Production text must have
  inspectable evidence and must follow the same selection and missing-data state as the chart.
- At narrow widths some supporting table columns are omitted. Preserve essential identity and
  scope, and ensure the finished widget offers an accessible expanded view of all selected metrics.
- Selected spans express intent, not a guarantee of three physical columns in every window.
  Wrapped rows distribute unused space to their remaining cards, keeping reading order intact.
  Every span in the production widget registry must be deliberately designed and validated.

## Acceptance rubric

- [x] The three screens feel unmistakably like Halfspace and distinct in hierarchy and density.
- [ ] Each story's main question is answered at first glance.
- [ ] Every highlighted number has an understandable unit, scope and evidence source.
- [ ] The follow-up visibly improves the view without losing relevant user context.
- [ ] Connected panels follow selection, filtering and missing data together.
- [ ] Layouts work at wide and narrow widths, including longer names and unavailable values.
- [ ] Keyboard navigation, dialogs and reduced motion remain usable.
- [ ] The selected widget families and supported sizes can be derived from accepted screens.

The visual direction has been accepted. Remaining items are production acceptance criteria;
browser verification of this example-data study does not establish provider integration.

## Saved previews

| Story              | Desktop                            | Narrow canvas                             |
| ------------------ | ---------------------------------- | ----------------------------------------- |
| Supporter          | [Preview](previews/supporter.png)  | [Preview](previews/supporter-narrow.png)  |
| Betting researcher | [Preview](previews/researcher.png) | [Preview](previews/researcher-narrow.png) |
| Analyst            | [Preview](previews/analyst.png)    | [Preview](previews/analyst-narrow.png)    |

## Verification

Checked on 13 September 2026 in Chromium:

- Initial requests, all three follow-ups, missing-data states, connected match selection, player
  selection including an empty shortlist, minimum minutes, and local save/reload passed.
- All three stories with complete and missing data passed horizontal-overflow checks at 1512,
  1050, 820, 390 and 320px window widths. Desktop and narrow screenshots were visually inspected.
- One-, two- and three-column preferences were exercised across every example widget.
- Keyboard activation, Escape dismissal and restored dialog focus worked with reduced motion.
- No browser runtime errors were reported during the interaction checks.
- Repository typecheck, lint, scoped formatting checks and `git diff --check` passed. Production
  application code was unchanged at the study checkpoint; these checks do not imply provider
  integration or alpha readiness. Subsequent implementation is tracked in the widget inventory.
