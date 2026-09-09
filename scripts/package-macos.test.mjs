import { describe, expect, it } from 'vitest'
import { releaseOptions } from './package-macos.mjs'

const notarization = {
  APPLE_ID: 'release@example.com',
  APPLE_APP_SPECIFIC_PASSWORD: 'test-password',
  APPLE_TEAM_ID: 'TESTTEAMID'
}

describe('macOS release selection', () => {
  it('refuses a default release without notarization credentials', () => {
    expect(() => releaseOptions([], {}, 'arm64')).toThrow('Signed releases require')
    expect(() => releaseOptions([], { ...notarization, APPLE_TEAM_ID: '' }, 'arm64')).toThrow(
      'APPLE_TEAM_ID'
    )
  })

  it('keeps a configured release signed and uses the selected architecture', () => {
    expect(releaseOptions(['--x64'], notarization, 'arm64')).toEqual({
      unsigned: false,
      arch: 'x64',
      checkOnly: false
    })
  })

  it('requires a password for an exported certificate', () => {
    expect(() =>
      releaseOptions([], { ...notarization, CSC_LINK: 'certificate.p12' }, 'arm64')
    ).toThrow('CSC_KEY_PASSWORD')
  })

  it('allows credential-free local packaging only through the explicit unsigned option', () => {
    expect(releaseOptions(['--unsigned', '--check'], {}, 'arm64')).toEqual({
      unsigned: true,
      arch: 'arm64',
      checkOnly: true
    })
  })

  it('rejects conflicting architectures and unsupported overrides', () => {
    expect(() => releaseOptions(['--unsigned', '--arm64', '--x64'], {}, 'arm64')).toThrow(
      'one architecture'
    )
    expect(() => releaseOptions(['--config.mac.notarize=false'], notarization, 'arm64')).toThrow(
      'Unknown option'
    )
  })
})
