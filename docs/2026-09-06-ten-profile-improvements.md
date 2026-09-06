# Ten Sportmonks coverage improvements

This pass adds 13 documented includes to six existing entity endpoints. Supported includes
increase from 187 to 200 of 1,320; endpoint coverage remains 57 of 153. The combined badge
still rounds to 17%.

## Delivered

1. Player birthplace: city and birth country, separate from nationality.
2. Player preferred foot from typed metadata.
3. Player registrations with linked clubs, reported dates, shirt numbers, and captain flags.
4. Pending transfers on Player Career, separate from rumours and completed history.
5. Club social channels with names, handles, and secure external links.
6. Coach playing-profile links into Player Career.
7. Referee nationality, birth city, and birth date when reported.
8. Venue location links distinguishing stadium and city coordinates.
9. Reported formation labels, including when individual team sheets are unavailable.
10. Fixture group and aggregate-tie context, including provider-reported related matches.

All additions use existing typed main/preload requests and renderer entity caches. New
relationships hydrate shared identities without changing squad membership or transfer history.
Search refreshes preserve richer player and venue records and do not extend detail freshness.
Fixture list refreshes preserve formations, groups, and aggregate context.

## Validation

- Current resources and enrichments were checked before implementation. All selected includes
  returned successful responses with the existing token.
- The six modified fetchers were then run against live player, team, coach, referee, venue, and
  fixture responses. All passed the production response schemas.
- Nineteen new tests cover requests, normalization, cache preservation, unknown data, secure
  links, coordinate validation, and presentation semantics.
- Production build, TypeScript, ESLint, Prettier, and coverage checks pass.
- Full suite: 637 of 638 tests pass. The same Matchday calendar test fails on an unchanged HEAD
  snapshot (618 of 619 pass). The calendar test passes when run on its own; this pass does not
  change its implementation or test.
- The player additions were visually checked in the running Electron app at wide and narrow
  window widths, including the supported empty pending-transfer state.
- Arsenal's social channel card, Emirates Stadium's separate stadium/city links, and the
  Birmingham City–Wolverhampton lineup labels were checked in the running app as well.

The sampled players had no pending transfers, and the sampled referee had no nationality or
city relation. Empty and missing states remain distinct; nonempty presentation is covered by
focused tests. No access claim is based on the presence or absence of records alone.
