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

- [ ] Save and reopen comparisons with complete entity, season, club, and match-location context.
- [ ] Open starter Views without an AI key.
- [ ] Add, remove, reorder, and resize View blocks manually.
- [ ] Duplicate a View as an independent saved copy.
- [ ] Change a View's competition and season using available contexts.

Each feature has its own commit. Saved user work stays outside disposable football caches.
Installer and pilot validation remain tracked separately in the [alpha milestone](macos-alpha.md).

## Final review

Pending completion of the five features.
