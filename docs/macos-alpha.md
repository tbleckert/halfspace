# macOS alpha milestone

My teams, first-run setup, and macOS packaging are implemented.
The signed release workflow passes on both architectures. Complete installation and first-session
validation, run the usability pilot, then move to reusable investigations.

## Outcome

Help someone connect Halfspace, find football relevant to them, and return on another matchday.
Start the pilot with five people who already have Sportmonks access. Their experience will guide
the next football features and focused design passes.

Complete API coverage remains the long-term goal. For this milestone, prioritize useful journeys
through existing football data and any verified provider gaps those journeys expose.

## Delivery sequence

1. **First-run setup.** Explain where to find a Sportmonks token, show the competitions
   available to that account, and offer optional team pins and TV country selection. Reuse existing
   preferences and subscription metadata. Let people skip personalization and change it later.
   Finish on Matchday with useful available football; distinguish missing coverage from an empty day.
2. **My teams on Matchday.** Surface upcoming fixtures and recent results for pinned teams,
   with direct match links. This gives pinned teams a useful place in the daily workspace.
3. **Installable macOS alpha.** Add packaging and a repeatable release workflow. Verify installation
   on a clean machine, token setup, cached reopening, and the journey from Matchday to a match and
   its team or player profiles. Observe five testers and resolve the friction they encounter.
4. **Reusable investigations.** Add Save this comparison, retaining both entities, seasons, player
   clubs, and home/away selections. Then offer starter Views that open without an AI key. Reuse
   existing comparison and view foundations; AI remains an optional way to compose and edit views.

The first two steps now form one user experience: setup leads directly to personalized Matchday. Premium odds, exhaustive referee history, and image exports remain later work.

## My teams

**User need:** When I open Halfspace, I can quickly see what is happening with the teams I pinned.

### Scope

- Place My teams below Featured game, with a heading outside the cards like Today.
- Read existing local pins and give each team a card with its linked name and logo as the header.
- Show one upcoming scheduled game and one previous completed result within 30 days of today,
  using the existing team-fixture query and normalized fixture cache.
- Hide cards with neither match; omit missing rows. Shared matches appear in each team's card.
- Keep direct match links with local date context, cached offline content, explicit unavailable
  states, static loading cards, and the existing viewport entrance for content.
- Offer Browse teams with no pins and preserve the rest of Matchday, including live games.

### Acceptance criteria

- [x] The heading is outside the cards and each team has its own name/logo header.
- [x] Pin and unpin changes update Matchday without restarting.
- [x] Each card shows at most one upcoming fixture and one completed result.
- [x] The shared team query covers 30 days before and after today; cards with neither match hide.
- [x] Cancelled, postponed, placeholder, and undated fixtures do not fill these slots.
- [x] Dates follow the user's time zone and match links retain return-date context.
- [x] Cached cards work offline; missing cache data is distinguished from a completed empty query.
- [x] Cards use a responsive grid and existing Matchday motion and loading conventions.

## First-run setup

Implemented on 9 September 2026. The flow uses the existing secure token form and cache reset,
subscribed competition catalog, entity search, local pins, subscription access, and TV listings.
The token instructions follow the [Sportmonks authentication guide](https://docs.sportmonks.com/v3/welcome/authentication).

- [x] Explain where to create a token and offer a MySportmonks link.
- [x] Show available competitions, with separate loading, offline, failure, and empty states.
- [x] Offer token replacement and retry when access cannot be checked.
- [x] Let people search and pin teams, or skip personalization entirely.
- [x] Offer optional TV country selection from the next week's reported broadcast listings,
      shared with TV Guide; check subscription access before loading the optional feed.
- [x] Finish on today's Matchday with the user's saved team pins.
- [x] Persist step progress and completion through restarts and football cache clearing.
- [x] Preserve the workspace for existing configured installations that predate the setup marker.
- [x] Retain the credential-reset gate and surface storage failures with a retry path.

## Installable alpha

The [release guide](macos-release.md) covers DMG and ZIP builds, required Apple credentials,
verification, and replacement installs. The [pilot checklist](alpha-pilot.md) records the release
gate and five-person observation plan.

- [x] Configure Apple silicon and Intel DMG/ZIP packaging with the canonical app icon.
- [x] Make Developer ID signing and notarization the default release path, failing on missing credentials.
- [x] Add a manual workflow that checks and builds both architectures and uploads verified artifacts.
- [x] Keep explicitly unsigned local builds separate and label their filenames.
- [x] Prepare installation, first-session, offline reopening, and return-visit pilot checks.
- [x] Configure Apple signing and notarization credentials and complete the signed release workflow.
- [ ] Validate downloaded signed installers on clean Apple silicon and Intel installations.
- [ ] Observe five testers, record return visits, and resolve the friction they encounter.

### Validation status

Both signed release jobs passed in [workflow run 34408077880](https://github.com/tbleckert/halfspace/actions/runs/34408077880)
for commit [`0f19c65`](https://github.com/tbleckert/halfspace/commit/0f19c652396ca793203d71be317e22f2517abf99).
Each job completed signing, notarization, verification, and installer upload.

Apple silicon download and installation have been reported successful. On 10 September 2026,
the developer also confirmed pinning a team, opening a match, retaining the token and pins after
reopening, and browsing previously loaded football offline in the installed app.

The installed build details, clean-machine or fresh-account status, and first-launch security flow
have not yet been recorded. Intel installation and launch, the remaining first-session checks,
replacement installs, and tester sessions remain unverified. Use the [pilot checklist](alpha-pilot.md)
to record these checks.

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
