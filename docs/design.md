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

## Matchday reference patterns

**Fixtures:** borderless competition cards, a linked logo and competition heading, equal-weight
team names, and aligned monospaced facts. Inset rounded rows use the sidebar active background
for hover and focus. Loading states follow the same structure.

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
