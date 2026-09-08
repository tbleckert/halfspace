# Personal macOS alpha

Agreed direction: 8 September 2026. Status: planned; the work below is not implemented.

## Outcome

Help someone connect Halfspace, find football relevant to them, and return on another matchday.
Start the pilot with five people who already have Sportmonks access. Their experience will guide
the next football features and focused design passes.

Complete API coverage remains the long-term goal. For this milestone, prioritize useful journeys
through existing football data and any verified provider gaps those journeys expose.

## Delivery sequence

1. **Personal first session.** Explain where to find a Sportmonks token, show the competitions
   available to that account, and offer optional team pins and TV country selection. Reuse existing
   preferences and subscription metadata. Let people skip personalization and change it later.
   Finish on Matchday with useful available football; distinguish missing coverage from an empty day.
2. **Your teams on Matchday.** Surface upcoming fixtures and recent results for pinned teams,
   with direct match links. This is the first feature slice, detailed below, and makes the
   existing pin action useful before extending setup.
3. **Installable macOS alpha.** Add packaging and a repeatable release workflow. Verify installation
   on a clean machine, token setup, cached reopening, and the journey from Matchday to a match and
   its team or player profiles. Observe five testers and resolve the friction they encounter.
4. **Reusable investigations.** Add Save this comparison, retaining both entities, seasons, player
   clubs, and home/away selections. Then offer starter Views that open without an AI key. Reuse
   existing comparison and view foundations; AI remains an optional way to compose and edit views.

The first two steps form one user experience. Implement Your teams first so the setup work has a
useful destination. Premium odds, exhaustive referee history, and image exports remain later work.

## First feature brief: Your teams

**User need:** When I open Halfspace, I can quickly see what is happening with the teams I pinned.

### Scope

- Add a compact Your teams section within the existing Matchday content, reusing the
  [Matchday visual patterns](design.md). Settle its placement in a viewable design pass before UI work.
- Read the existing local team pins. Pinning and unpinning should update the section immediately.
- Show reported live matches, upcoming fixtures, and recent results involving pinned teams, with
  clear dates and direct match links. Deduplicate a fixture when both teams are pinned.
- Start with the existing Matchday date window. Use date-scoped labels and a link to each team's
  Fixtures page for broader browsing; a bounded window cannot establish the globally next fixture
  or latest result. A team without matches in the loaded window remains reachable through its profile.
- With no pins, offer one quiet action to browse Teams. Keep broader Matchday football available.
- Reuse shared fixture caches, status presentation, links, refresh policies, and local preferences.
  Preserve the existing live ticker, Featured game, today's fixtures, news, and date navigation rules.

### Acceptance criteria

- [ ] An existing pinned team contributes its reported fixtures in the current date window.
- [ ] Pinning or unpinning from Teams or a team header updates Matchday without restarting.
- [ ] A match between two pinned teams appears once in Your teams.
- [ ] Live, scheduled, and completed matches use the existing status rules. Cancelled or postponed
      matches cannot be presented as the next scheduled game.
- [ ] Dates follow the user's time zone and update across midnight and app focus changes.
- [ ] Cached content opens offline. Missing or partial cache coverage is distinguishable from a
      completed query reporting no fixtures; the interface makes no claim about matches outside it.
- [ ] Match links retain return-date context. Each pinned team remains reachable when its window
      has no reported fixtures.
- [ ] Long names, multiple pins, narrow windows, keyboard navigation, and reduced motion are checked
      visually. Loading states follow existing Matchday patterns.
- [ ] Automated checks cover fixture selection, deduplication, query completeness, and reactive pin
      changes. Run the repository's required checks before marking the feature shipped.

## Pilot acceptance

These are proposed pilot targets, not measured results:

- At least four of five testers reach a relevant match without assistance.
- At least three return on a later matchday.

Record where people get stuck, what they look for, and why they return through observed sessions
and direct feedback. Use that evidence to choose the next design pass and data expansion.

## Existing foundations

- [Roadmap](../README.md#roadmap)
- [Matchday](../src/renderer/src/features/fixtures/matchday-page.tsx)
- [Fixture window](../src/renderer/src/features/fixtures/matchday-hub.ts)
- [Team pins](../src/renderer/src/features/teams/use-team-pins.ts)
- [Token setup](../src/renderer/src/features/credentials/token-setup.tsx)
- [TV country preference](../src/renderer/src/features/broadcasts/tv-guide-page.tsx)
- [Comparison workspace](../src/renderer/src/features/comparisons/comparison-page.tsx)
- [Supported View blocks](../src/shared/views.ts)
