# macOS alpha pilot

Observe five people who already have Sportmonks access. Start with a 20-minute session and ask
them to return on a later matchday. Use the results to decide what to fix before adding the next
feature. These checks and targets are planned; no tester results have been recorded yet.

## Release gate

Record the version, source commit, architecture, macOS version, and checksum of the actual
downloaded installer. Use the [signed release process](macos-release.md).

- [ ] Apple silicon and Intel release jobs pass, including signing and notarization checks.
- [ ] Download the DMG on a Mac or macOS account without a previous Halfspace installation.
- [ ] Open the DMG, drag Halfspace to Applications, eject the disk, and open the installed app
      through the normal macOS flow without security overrides.
- [ ] The app has the Halfspace icon, name, and correct version.
- [ ] Complete token setup using the tester's own Sportmonks token; confirm the subscribed
      competitions are understandable and failed access has a usable recovery path.
- [ ] Quit during personalization and reopen; confirm setup resumes at the saved step.
- [ ] Pin a team, optionally choose a TV country, and reach today's Matchday.
- [ ] Open a relevant match, then its team or a linked player, and return with the expected context.
- [ ] Quit and reopen; the saved token, pins, completed setup, and cached football remain usable.
- [ ] Reopen offline and browse previously loaded football; missing data stays distinct from
      empty data. Reconnect and confirm overdue data refreshes.
- [ ] Replace the app with the next signed build and confirm the same preferences and caches.
- [ ] Repeat installation and launch on both architectures before claiming both are verified.

## Observed first session

Explain that Halfspace uses their existing Sportmonks access. Ask them to share their screen
after entering their token; do not record credentials. Give these tasks one at a time and let
them choose the team and match. Offer help when needed, and record that help.

1. "Set up Halfspace for football you follow."
2. "Find a match that matters to you."
3. "Find something useful about that match, one of its teams, or a player."
4. "Make it easy to find your team the next time you open the app."
5. "Close and reopen Halfspace. Show me what you would do next."

Record completion, time to the first relevant match, where they hesitated, the words they used,
and whether the problem was navigation, missing coverage, stale data, or a technical failure.
Do not infer a coverage denial from an empty result.

Afterward ask what was most useful, what was missing, and what would bring them back. On a later
matchday ask whether they returned, what triggered the visit, and whether their pinned teams
helped. Record an actual visit separately from an intention to return.

## Session record

Keep records privately; do not commit names, tokens, account details, or recordings to this
open-source repository. Use this blank structure:

| Field                     | Observation |
| ------------------------- | ----------- |
| Anonymous tester ID       |             |
| Build / macOS / CPU       |             |
| Relevant match found      |             |
| Assistance needed         |             |
| Time to relevant match    |             |
| Most useful information   |             |
| Friction and exact action |             |
| Returned on a later day   |             |
| Reason for returning      |             |
| Follow-up fix             |             |

## Decision after five sessions

The proposed targets are four of five people reaching a relevant match without assistance and
three returning on a later matchday. Fix installation, setup, navigation, and data-trust failures
first. Summarize repeated needs with the observed evidence, then decide whether saved comparisons
and starter Views remain the next slice. Keep these targets separate from measured results.
