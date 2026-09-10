# Reusable investigations and component review

## Before implementation

Reviewed shared UI primitives and their consumers, with closer inspection of Teams, Views,
comparison controls, navigation, and fixture charts.

- Replaced the Teams directory's duplicate native select styling with `NativeSelect`.
- Reused `Button`, `Input`, and `Label` in Views and added the standard shared `Textarea`
  following the existing input conventions and [shadcn component](https://ui.shadcn.com/docs/components/base/textarea).
- Removed superseded local control CSS. Retained specialized football navigation, chart controls,
  and native disclosures where a different primitive would add complexity without improving behavior.
- Validation: TypeScript, ESLint, formatting, and all 769 tests passed.

## Feature checklist

- [x] Save and reopen comparisons with complete entity, season, club, and match-location context.
- [x] Open starter Views without an AI key.
- [x] Add, remove, reorder, and resize View blocks manually.
- [x] Duplicate a View as an independent saved copy.
- [x] Change a View's competition and season using available contexts.

Each feature has its own commit. Saved user work stays outside disposable football caches.
Installer and pilot validation remain tracked separately in the [alpha milestone](macos-alpha.md).

## Final review

Repeated the control, component, and style audit across the renderer after implementing all five
features. The final review found and addressed these issues:

- Consolidated the three repeated competition-and-season option lists into a focused
  `ViewContextSelect`, composed from the existing `NativeSelect`.
- Used shared Card surfaces for Teams, saved comparisons, and manual block editing. Kept the
  saved-comparison loading state distinct from an empty library, and used Dialog triggers for
  correct focus restoration from either entry point.
- Removed an unlayered `button, input { font: inherit }` rule that overrode shared component
  typography. Browser inspection confirmed the View title now uses its intended 26px/600 style.
- Replaced View data placeholders with Card, Skeleton, and ErrorAlert. Drawing outlines now belong
  only to actual AI composition; missing offline data has a static, explicit status.
- Removed duplicate composer-button motion and dead placeholder/control CSS, and gave the editable
  View title the available width. Updated the design guide and roadmap to reflect shipped scope.

Retained the specialized week navigator, directory button group, and pressure-chart event controls.
Native disclosures already provide keyboard behavior. Replacing those with additional abstractions
would add overrides without simplifying their behavior. No new provider endpoints, data caches, or
AI execution paths were introduced.

## Feature commits

| Feature                          | Commit    |
| -------------------------------- | --------- |
| Saved comparisons                | `05c1b1a` |
| Starter Views                    | `7518efc` |
| Manual block and layout editing  | `fbe9041` |
| Independent View copies          | `338540b` |
| Competition and season switching | `33594f4` |

The initial component cleanup is `5f1fd56`; the second maintainability cleanup is `64bc4c7`.
Design fixes and this final validation record are committed separately from the five features.

## Verification

- All 789 tests across 178 files pass, including persistence through cache resets, full comparison
  context restoration, AI-free starter/save/reopen flows, manual layout editing and undo, copy
  independence, and replacing cached content when competition or season identity changes.
- Production main, preload, and renderer bundles build successfully.
- Browser checks at 1440 × 950 and 820 × 760 cover saving, reopening, duplication, context changes,
  keyboard focus restoration, reduced motion, long titles, shared Teams controls, and horizontal
  overflow. These checks use isolated synthetic cached football data and a stubbed Electron bridge.
- TypeScript, ESLint, Prettier, API coverage consistency, and whitespace checks are part of the
  final repository validation.

Installer signing, clean installations, and the usability pilot were outside this feature pass;
their remaining checks stay open in the alpha milestone.
