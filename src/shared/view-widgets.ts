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
    status: 'planned',
    context: 'team',
    columns: widgetColumns,
    description: 'Defined match samples with aligned goals and performance trends.'
  },
  {
    type: 'team-news',
    label: 'Team news',
    status: 'planned',
    context: 'team',
    columns: widgetColumns,
    description: 'Relevant sourced news and editorial context.'
  },
  {
    type: 'fixture-broadcasts',
    label: 'Where to watch',
    status: 'planned',
    context: 'fixture',
    columns: widgetColumns,
    description: 'Fixture-specific broadcasters in the selected country.'
  },
  {
    type: 'player-profile',
    label: 'Player profile',
    status: 'planned',
    context: 'player',
    columns: widgetColumns,
    description: 'Identity, selected club and season, playing time and key metrics.'
  },
  {
    type: 'player-comparison',
    label: 'Player comparison',
    status: 'planned',
    context: 'comparison',
    columns: widgetColumns,
    description: 'Connected player selection, aligned per-90 metrics and sample sizes.'
  },
  {
    type: 'team-comparison',
    label: 'Team comparison',
    status: 'planned',
    context: 'comparison',
    columns: widgetColumns,
    description: 'Independent team, season and home/away comparisons.'
  },
  {
    type: 'market-shortlist',
    label: 'Market shortlist',
    status: 'planned',
    context: 'fixtures',
    columns: widgetColumns,
    description: 'A filtered selection of matches linked to evidence and prices.'
  },
  {
    type: 'odds-comparison',
    label: 'Price comparison',
    status: 'planned',
    context: 'fixture',
    columns: widgetColumns,
    description: 'Like-for-like active bookmaker quotes with update times.'
  },
  {
    type: 'probability-context',
    label: 'Probability context',
    status: 'planned',
    context: 'fixture',
    columns: widgetColumns,
    description: 'Verified probability sources, market alignment and explicit uncertainty.'
  }
] as const

export const implementedViewWidgets = viewWidgets.filter(
  (widget) => widget.status === 'implemented'
)
export type ViewWidgetType = (typeof implementedViewWidgets)[number]['type']

export function viewWidget(type: ViewWidgetType): (typeof implementedViewWidgets)[number] {
  return implementedViewWidgets.find((widget) => widget.type === type)!
}
