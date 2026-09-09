# macOS alpha releases

Halfspace packages as a DMG and ZIP for Apple silicon (`arm64`) and Intel (`x64`).
The minimum OS is macOS 13, matching the bundled Electron runtime. The first pilot version is
`0.1.0-alpha.1`. App identity stays `com.halfspace.app` across releases.

Tester releases require Developer ID signing, hardened runtime, and Apple notarization. The
release command fails when credentials are missing; it never falls back to an unsigned build.
The app icon is generated from the canonical [Halfspace logo](../resources/halfspace-logo.svg).

## Apple credentials

1. Create or use an existing **Developer ID Application** certificate and its private key.
   Follow [Apple's certificate instructions](https://developer.apple.com/help/account/certificates/create-developer-id-certificates/).
   A Developer ID Installer certificate is not needed for this DMG/ZIP distribution.
2. Export the certificate **with its private key** from Keychain Access as a password-protected
   `.p12` file. Keep the export outside the repository.
3. Create an [Apple app-specific password](https://support.apple.com/en-us/102654) for notarization.
   Use the Apple account and Developer Team ID that own the certificate.
4. Add these repository Actions secrets in
   [Halfspace's settings](https://github.com/tbleckert/halfspace/settings/secrets/actions):

| GitHub secret                 | Value                                        | Local environment variable    |
| ----------------------------- | -------------------------------------------- | ----------------------------- |
| `MAC_CERTIFICATE_P12`         | Base64-encoded `.p12`, including private key | `CSC_LINK`                    |
| `MAC_CERTIFICATE_PASSWORD`    | Password used when exporting the `.p12`      | `CSC_KEY_PASSWORD`            |
| `APPLE_ID`                    | Apple account email                          | `APPLE_ID`                    |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password                        | `APPLE_APP_SPECIFIC_PASSWORD` |
| `APPLE_TEAM_ID`               | Developer Team ID                            | `APPLE_TEAM_ID`               |

For a local release, `CSC_LINK` can be the path to the `.p12` instead of its base64 contents.
It can be omitted when a valid Developer ID Application certificate and private key are already
in the local keychain. The three Apple notarization variables are still required. Never put
credential values in source files, build configuration, or issue reports.

## Build a signed release

Use macOS with Xcode command-line tools, Node.js 22.12 or newer, and the repository's pnpm version.
Allow several gigabytes of free disk space for runtime downloads, unpacked apps, and temporary
disk images. After configuring the credentials above:

```sh
pnpm install --frozen-lockfile
pnpm release:mac --check
pnpm check
pnpm release:mac --arm64
pnpm release:mac --x64
```

`--check` checks credential configuration; Apple validates the actual credentials while signing
and notarizing. Each build writes to `dist/release/<architecture>/` and produces:

- `Halfspace-<version>-<architecture>.dmg`
- `Halfspace-<version>-<architecture>.zip`
- `Halfspace-<version>-<architecture>.sha256`

The command builds the app and icon, signs and notarizes the app, checks both archives, verifies
the Developer ID signature and stapled app ticket, and asks Gatekeeper to assess the app. It then
notarizes and staples the signed DMG and assesses that container too. Checksums are written only
after these steps succeed. Apple submission failures stop the release; the submission ID can be
used with `xcrun notarytool log` to inspect a rejection.

The [macOS alpha workflow](../.github/workflows/macos-release.yml) runs the same process on native
Apple silicon and Intel runners. Once this workflow is on `main` and the secrets are configured,
run **macOS alpha** manually from GitHub Actions with `main` selected. It runs `pnpm check` on both
architectures and uploads verified DMG, ZIP, and checksum files for 14 days. It does not publish a
GitHub Release or send files to testers. Complete the [pilot checklist](alpha-pilot.md) before
distributing the downloaded installers.

See [Electron's signing guidance](https://www.electronjs.org/docs/latest/tutorial/code-signing)
and [Apple's notarization documentation](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
for the platform requirements.

## Local packaging checks

Without Apple credentials, use the explicitly unsigned command:

```sh
pnpm package:mac:unsigned --arm64
pnpm package:mac:unsigned --x64
```

These builds use an ad-hoc signature for local execution. Their filenames contain `unsigned`,
and they go to `dist/unsigned/<architecture>/`. They have no Developer ID identity or notarization
ticket and are not the tester release. The release workflow never uploads this directory.

For a fresh-profile check, launch the packaged executable with Electron's `--user-data-dir`
pointing to a new temporary directory. This isolates both app preferences and football caches:

```sh
alpha_profile=$(mktemp -d)
dist/unsigned/arm64/mac-arm64/Halfspace.app/Contents/MacOS/Halfspace \
  --user-data-dir="$alpha_profile"
```

Quit before reopening the same profile. A new macOS account or another Mac is still required to
verify a real downloaded installation and Gatekeeper behavior. Local unsigned execution does
not establish that the signed distribution is ready.

## Updating the alpha

Increment the prerelease version in `package.json`, rerun checks, and build both architectures.
Quit Halfspace and replace the application in Applications with the newer signed build. User
credentials, local preferences, and cached data live outside the application bundle. There is no
automatic updater in this milestone; verify replacement and cached reopening during the pilot.
