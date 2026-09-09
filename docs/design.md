# Halfspace design

Halfspace uses an **airy editorial football** style: a shared white canvas, distinctive
typographic hierarchy, softly colored cards, and small moments of playful motion. It should
feel welcoming and light while making football information easy to scan. The content gives
the workspace its structure.

This guide records the direction agreed during the Matchday design pass. Use Matchday as the
reference for future visual work. Extend the style piece by piece; card entrance motion
currently belongs only to Matchday. Product behavior and data requirements remain in
[AGENTS.md](../AGENTS.md).

## What gives it its character

Breathing room, expressive typography, and coral/violet accents give Halfspace its character.
Airy cards and columns share one white background; content, alignment, and spacing provide
their separation. A spring entrance adds a little energy as cards come into view.

Keep those qualities together: calm surfaces, confident hierarchy, and selective color. Put
football names, scores, and imagery at the center of the composition. These principles describe
Halfspace's own design language and stand on their own.

## Canvas, cards, and spacing

- Main content and both sidebars share a white background. Columns are separated by their
  content, alignment, and gutters, without vertical borders.
- Cards use muted background fills, with no outer borders or shadows. Shared data cards are
  warm neutral; Matchday news cards are muted coral. Loading cards use the same surfaces.
- Establish hierarchy inside a card through headings, spacing, weight, and aligned columns.
  Keep related facts close and leave more space between distinct groups. Avoid repeated row
  dividers and card-header rules.
- Use a background change for hover and retain clear keyboard focus. Borderless cards still
  need recognizable links, controls, and focus states.
- Follow the shared card radius and spacing components. Small details can have tighter corners:
  the live ticker's time/state badge uses a 2px radius.
- Keep controls compact, using the existing 32px default and Nova density reference. Airiness
  comes from room around content groups, while controls and related facts stay close together.

This is a surface rule, not a blanket removal of useful indicators. Horizontal local navigation
keeps its shared rule and active underline; form controls and keyboard focus remain legible.

## Typography and football hierarchy

Use type to make the structure apparent before adding decoration. Headings are direct and
confident; supporting context is smaller and quieter. Keep one clear page title and omit
eyebrow labels, redundant explanations, and prototype copy.

The current interface uses Inter with system fallbacks. Use the regular interface font for
names, headings, labels, positions, and prose. Use monospaced tabular typography for scores,
clocks, match states, statistics, odds, table values, shirt numbers, and W/D/L. The week
navigator's weekday and date labels stay in the interface font.

Build typographic character through differences in size, weight, spacing, and the contrast
between interface text and compact football facts. Any new typeface needs its own deliberate
design pass.

On fixture cards, give both teams equal emphasis and align each score with its team. Keep the
team pair tight, allow the competition heading room, and leave a larger gap between matches.
Kickoff times and terminal states are supporting information; green live states are easier to
spot. Use one status column instead of repeating state badges.

## Color roles

Coral and violet are Halfspace's primary interface colors. Violet anchors actions and selection;
coral brings warmth to news surfaces and graphics. White, warm neutrals, and dark ink support
that palette.

Use semantic tokens from [styles.css](../src/renderer/src/styles.css), rather than adding local
color variants. These are the current reference values:

| Role                             | Token                         | Value     |
| -------------------------------- | ----------------------------- | --------- |
| Shared white canvas and sidebars | `background`, `sidebar`       | `#ffffff` |
| Dark ink                         | `foreground`                  | `#302c32` |
| Warm neutral cards               | `card`                        | `#f5f3f1` |
| Muted coral news cards           | `accent`                      | `#ffede7` |
| Active text and primary actions  | `primary`                     | `#7448a0` |
| Muted active and hover surfaces  | `secondary`, `sidebar-accent` | `#f0eaf7` |
| Supporting text                  | `muted-foreground`            | `#6e6870` |
| Coral graphic and chart accents  | `chart-1`                     | `#e8785f` |
| Violet graphic and chart accents | `chart-2`                     | `#9470bd` |

Use coral and violet for opposing chart series and selective graphic accents. Keep green,
red, and yellow where they communicate football states. Large navigation surfaces stay quiet,
with muted active backgrounds and violet text. Maintain readable contrast, including on muted
fills.

Treat the existing [Halfspace logo](../resources/halfspace-logo.svg) as a separate asset with
its own colors. Use the coral-and-violet palette above for interface design.

## First-run setup

Use the same white canvas in a focused fullscreen flow, with the top strip reserved for window
movement. Center a compact column with the Halfspace logo, a direct heading, quiet supporting text,
and a step count beneath the actions. Keep the content scrollable at short or narrow window sizes.
Use warm cards for token guidance and the subscribed competition list; use violet for selection
and the main action. Move keyboard focus to the heading when steps change, and keep these screens
static rather than extending Matchday's card animation.

The three screens are Connect Sportmonks, Your competitions, and Choose your teams. Team search
uses the existing star action and shows selected teams above the search field. TV country is an
optional disclosure on the team screen, loading actual broadcast countries when opened. Offer
Skip setup from the competition screen; Open Matchday also works without any pinned teams.
Show loading, offline, access, and storage errors explicitly without blocking optional choices.

## Matchday reference patterns

**Matchday and Fixtures:** Matchday stays on today with a visible heading and quiet date. The
separate Fixtures destination owns week navigation and the date picker. Up next is a single list
of ten fixtures after today, with quiet date and competition context and a View all link.

Both views use borderless competition cards, a linked logo and competition heading, equal-weight
team names, and aligned monospaced facts. Inset rounded rows use the sidebar active background
for hover and focus. Loading states follow the same structure.

**Featured game:** a compact violet-tinted card at the top of Matchday. Use the actual venue as
low-contrast, dotted halftone background imagery, fading towards readable team names and compact
football facts. Missing imagery gets a simple dot pattern. Keep the team crests small and the
scoring explanation factual; points remain internal. Selection and visibility rules are in AGENTS.md.

**Fixture hero:** reuse Featured game's violet tint, faded halftone venue background, and dot-pattern
fallback behind the score and navigation. Keep the background decorative and the foreground legible.
Place the active tab underline at the bottom of the hero, without a shared navigation divider.
During play, pair the green live dot with the reported minute or match phase rather than a Live label.

**Teams:** a searchable directory with All teams and Pinned views, compact country and competition
filters, and paginated team cards. Use the shared star action in the directory and team header.
Pinned teams appear beneath Teams in the sidebar and contribute to Featured game selection.

**My teams:** place the section below Featured game, with its heading outside the cards like Today.
Use one warm-neutral card per pinned team, in two columns when there is room and stacked otherwise.
Each card header links the team name and logo to its profile. Follow it with one Upcoming fixture
and one Previous result, using the shared fixture rows with local date and competition context.
Query 30 days before and after today through the existing team-fixture cache. Omit a missing row;
hide the team card when neither match exists. Matches between pinned teams appear in both cards.
Keep unavailable/offline states explicit and retain cached content during refresh. Put Manage teams
(or Browse teams with no pins) beside the section heading. Use the existing viewport entrance for
content and static loading cards. Live matches remain in the global Matchday sections.

**News:** one coral card per article, with its competition, headline, and necessary context.
Combine previews and reports by newest match date, with undated articles last. Keep AI-written
report labels. The rail has no News heading or feed tabs and scrolls independently. At narrow
widths, it follows the fixtures in the main scroll area. Keep its footer within the available
height below the ticker.

**Live ticker:** a compact 36px bar spanning the whole window. Align its content with the macOS
traffic lights and place the Live dot and label after them, centered together. Omit the count
and competition names. Use reported team short codes with full-name fallbacks and accessible
labels. Team logos sit inside the names, beside their scores. Between the two scores, show the
minute or phase in bold on a white badge with 2px corners, without a minute mark. Keep fixture
links outside the window drag area and allow horizontal scrolling.

## Motion

Reuse [MatchdayCard](../src/renderer/src/features/fixtures/matchday-card.tsx) inside
`MatchdayMotion` for Matchday content cards. Preserve the current feel:

| Property      | Current behavior                                           |
| ------------- | ---------------------------------------------------------- |
| Entrance      | Scale `0.95 → 1`, opacity `0 → 1`                          |
| Spring        | Bounce `0.35`, duration `0.5s`                             |
| Fade          | Duration `0.2s`                                            |
| Stagger       | `50ms` per card, capped at `150ms`                         |
| Viewport      | `whileInView`, `once: true`, `amount: 0.1`                 |
| Accessibility | Skip entrances for keyboard interaction and reduced motion |

Cards begin their entrance when they enter the visible scroll area, including the independently
scrolling news rail. Scrolling back and cached-data updates do not replay it. Keep card height
in normal layout and content usable throughout. Loading skeletons do not pop in. Preserve
persistent route shells and keep this behavior explicit in the component, rather than adding
an app-wide DOM animation observer.

## Continuing the design

Use the shared components and tokens first. Before adding a border, shadow, badge, or large
color block, check whether spacing, alignment, or typography can make the hierarchy clearer.
Keep low-resolution provider imagery compact and supporting.

For a visual change, inspect the actual view at wide and narrow widths, including long names,
missing data, scrolling, focus, and reduced motion when relevant. Compare with Matchday's
settled patterns and make one coherent change at a time.

When a new design decision is agreed, update this guide and the matching rule in `AGENTS.md`
together. Update token values here alongside changes to their source. This guide records
approved decisions; keep exploratory alternatives separate until selected.

- TV Guide uses a saved country selection and shared Monday-to-Sunday week navigation with a
  URL-backed selected day. Show only that day's unfinished broadcasts in kickoff order, without competition
  grouping. Place prominent monospaced kickoff times to the left of team logos, with broadcaster
  links beneath the teams. Omit not-started labels and pre-match scores. Preserve country-specific
  listings and cache complete daily windows.

### Football discovery

Players uses the existing directory layout with compact warm profile cards, a quiet search field,
and country selection. Show the reported nationality and position, with a separate country label
when country differs from nationality. Keep player portraits compact and make the whole card a link.
Competition country selection sits beside search. Team Seasons uses one shared card per competition
with compact monospaced season links; keep every reported season accessible without inventing current
membership from historical records.
