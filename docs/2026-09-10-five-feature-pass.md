# Saved comparisons and component review

This record covers the saved-comparison and shared-component work from the September 10 pass.

## Implemented

- Save and reopen comparisons with complete entity, season, club, and match-location context.
- Keep saved comparisons outside disposable football caches.
- Reuse shared Card, Dialog, Input, and Button components for saving and reopening comparisons.
- Distinguish a loading comparison library from an empty one, with Dialog triggers restoring focus.
- Replace the Teams directory's duplicate native select styling with `NativeSelect`.
- Remove the unlayered `button, input { font: inherit }` rule that overrode shared typography.

Retained the specialized week navigator, directory button group, pressure-chart event controls,
and native disclosures. These already provide the required behavior without additional abstractions.

Saved comparisons were introduced in `05c1b1a`. The shared component cleanups include `5f1fd56`
and `64bc4c7`.

## Verification at the time

The broader feature pass passed TypeScript, ESLint, formatting, API coverage consistency,
production builds, and all 789 tests across 178 files. Comparison checks included persistence
through cache resets and complete context restoration.

Installer signing, clean installations, and the usability pilot were outside this feature pass;
their remaining checks stay open in the [alpha milestone](macos-alpha.md).
