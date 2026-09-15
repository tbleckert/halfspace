export const widgetColumns = [1, 2, 3] as const
export type WidgetColumns = (typeof widgetColumns)[number]

// This is the catalog for generation, manual editing, and implementation tracking.
// A widget is implemented only when its data and all three presentations are usable.
export const viewWidgets = [
  {
    type: 'fixtures',
    label: 'Competition fixtures',
    status: 'implemented',
    context: 'competition',
    columns: widgetColumns,
    description: 'Upcoming fixtures or recent results within a 14-day season window.'
  },
  {
    type: 'standings',
    label: 'Standings',
    status: 'implemented',
    context: 'competition',
    columns: widgetColumns,
    description: 'Reported competition standings, with optional team highlighting.'
  },
  {
    type: 'leaders',
    label: 'Player leaders',
    status: 'implemented',
    context: 'competition',
    columns: widgetColumns,
    description: 'Goals, assists, yellow-card or red-card leaders for a season.'
  },
  {
    type: 'team-next-match',
    label: 'Next match',
    status: 'implemented',
    context: 'team',
    columns: widgetColumns,
    description: 'The next scheduled match across competitions in the next 30 days.'
  },
  {
    type: 'team-season',
    label: 'Season snapshot',
    status: 'implemented',
    context: 'team-season',
    columns: widgetColumns,
    description:
      'The selected team’s reported position, points, played matches and form, per standing group.'
  },
  {
    type: 'team-season-results',
    label: 'Season results',
    status: 'implemented',
    context: 'team-season',
    columns: widgetColumns,
    description:
      'Completed matches from the reported season schedule for an exact team, competition and season, including historical seasons.'
  },
  {
    type: 'team-fixtures',
    label: 'Team fixtures',
    status: 'implemented',
    context: 'team',
    columns: widgetColumns,
    description:
      'Upcoming fixtures or recent results across competitions, 30 days either side of today.'
  },
  {
    type: 'team-availability',
    label: 'Team availability',
    status: 'implemented',
    context: 'team',
    columns: widgetColumns,
    description: 'Current reported absences, independent of historical season selection.'
  },
  {
    type: 'form-trend',
    label: 'Form trend',
    status: 'implemented',
    context: 'team',
    columns: widgetColumns,
    description:
      'Goals scored, conceded and results for up to six completed matches in the last 100 days, across all competitions. Supports all, home or away matches; not a league-only or season sample.'
  },
  {
    type: 'team-news',
    label: 'Team news',
    status: 'implemented',
    context: 'team',
    columns: widgetColumns,
    description:
      'Match previews and AI-written reports for up to three recent and three upcoming team fixtures in a 30-day window. Not general club or transfer news.'
  },
  {
    type: 'fixture-broadcasts',
    label: 'Where to watch',
    status: 'implemented',
    context: 'match-source',
    columns: widgetColumns,
    description:
      'Broadcasters for the match in a linked match source, following its resolved fixture. Uses the preferred country, all countries, or a known broadcast country.'
  },
  {
    type: 'player-profile',
    label: 'Player profile',
    status: 'implemented',
    context: 'player-statistics',
    columns: widgetColumns,
    description:
      'Player identity and reported statistics for an exact player, club, competition and season selection.'
  },
  {
    type: 'player-comparison',
    label: 'Player comparison',
    status: 'implemented',
    context: 'player-comparison',
    columns: widgetColumns,
    description: 'Connected player selection, aligned per-90 metrics and sample sizes.'
  },
  {
    type: 'team-comparison',
    label: 'Team comparison',
    status: 'implemented',
    context: 'team-comparison',
    columns: widgetColumns,
    description: 'Independent team, season and home/away comparisons.'
  },
  {
    type: 'fixture-head-to-head',
    label: 'Head-to-head',
    status: 'implemented',
    context: 'match-source',
    columns: widgetColumns,
    description:
      'Up to five completed previous meetings between the linked match participants, before its kickoff. Cross-competition sample, not an all-time record.'
  },
  {
    type: 'fixture-absences',
    label: 'Match absences',
    status: 'implemented',
    context: 'match-source',
    columns: widgetColumns,
    description:
      'Reported absences for both participants of a linked match source. Missing data is not a confirmed healthy squad.'
  },
  {
    type: 'fixture-weather',
    label: 'Match weather',
    status: 'implemented',
    context: 'match-source',
    columns: widgetColumns,
    description:
      'Provider-reported weather for a linked match source, with forecast or recorded status and known units. No inferred match effects.'
  },
  {
    type: 'team-squad',
    label: 'Team squad',
    status: 'implemented',
    context: 'team-season',
    columns: widgetColumns,
    description:
      'Reported squad for an exact team and season. Shows up to twelve players with squad-reported positions and shirt numbers; links to the full squad.'
  },
  {
    type: 'team-transfers',
    label: 'Team transfers',
    status: 'implemented',
    context: 'team',
    columns: widgetColumns,
    description:
      'Up to six reported completed transfers in the last 365 days, filtered by all, incoming or outgoing. Excludes pending moves and rumours.'
  },
  {
    type: 'market-shortlist',
    label: 'Market shortlist',
    status: 'implemented',
    context: 'discovery',
    columns: widgetColumns,
    description:
      'Upcoming matches across all available competitions by default, or an explicitly selected competition and season, in the next seven days or this weekend, with full-time result prices and an All/Home/Draw/Away outcome filter. Selected match drives linked widgets; no value ranking.'
  },
  {
    type: 'odds-comparison',
    label: 'Odds comparison',
    status: 'implemented',
    context: 'match-source',
    columns: widgetColumns,
    description:
      'Pre-match bookmaker prices for a linked match source. Automatic selection uses full-time result for a shortlist. Select an available market and bookmaker; preserve exact outcomes, lines and quote timestamps.'
  },
  {
    type: 'probability-context',
    label: 'Probability context',
    status: 'implemented',
    context: 'match-source',
    columns: widgetColumns,
    description:
      'Sportmonks pre-match probabilities for match result, both teams to score or total goals 2.5, following a match source. Shows provider provenance, fetch time and unknown calibration; no inferred edge.'
  }
] as const

export const implementedViewWidgets = viewWidgets.filter(
  (widget) => widget.status === 'implemented'
)
export type ViewWidgetType = (typeof implementedViewWidgets)[number]['type']

export function viewWidget(type: ViewWidgetType): (typeof implementedViewWidgets)[number] {
  return implementedViewWidgets.find((widget) => widget.type === type)!
}
