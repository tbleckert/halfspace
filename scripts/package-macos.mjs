import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const notarizationVariables = ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']

export function releaseOptions(args, environment, hostArch = process.arch) {
  const allowed = ['--unsigned', '--arm64', '--x64', '--check']
  const unknown = args.find((arg) => !allowed.includes(arg))
  if (unknown) throw new Error(`Unknown option: ${unknown}`)
  if (args.includes('--arm64') && args.includes('--x64')) {
    throw new Error('Build one architecture at a time: --arm64 or --x64.')
  }

  const unsigned = args.includes('--unsigned')
  const arch = args.includes('--arm64') ? 'arm64' : args.includes('--x64') ? 'x64' : hostArch
  if (!['arm64', 'x64'].includes(arch)) throw new Error('Use --arm64 or --x64.')
  if (!unsigned) {
    const missing = notarizationVariables.filter((name) => !environment[name]?.trim())
    if (missing.length) {
      throw new Error(`Signed releases require ${missing.join(', ')}. See docs/macos-release.md.`)
    }
    if (environment.CSC_LINK && !environment.CSC_KEY_PASSWORD) {
      throw new Error('Set CSC_KEY_PASSWORD for the exported signing certificate.')
    }
  }
  return { unsigned, arch, checkOnly: args.includes('--check') }
}

function run(command, args, environment = process.env) {
  execFileSync(command, args, { stdio: 'inherit', env: environment })
}

function verifyDeveloperSignature(path) {
  run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', path])
  const signature = spawnSync('codesign', ['--display', '--verbose=4', path], {
    encoding: 'utf8'
  })
  if (signature.status !== 0 || !signature.stderr.includes('Authority=Developer ID Application:')) {
    throw new Error(`Expected a Developer ID Application signature on ${path}.`)
  }
}

async function packageMac() {
  const { unsigned, arch, checkOnly } = releaseOptions(process.argv.slice(2), process.env)
  if (process.platform !== 'darwin') throw new Error('macOS packaging must run on a Mac.')

  if (!unsigned && !process.env.CSC_LINK) {
    const identities = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], {
      encoding: 'utf8'
    })
    if (!identities.includes('Developer ID Application:')) {
      throw new Error(
        'A Developer ID Application certificate is required. See docs/macos-release.md.'
      )
    }
  }
  if (checkOnly) {
    console.log(unsigned ? 'Local unsigned build selected.' : 'Release credentials are configured.')
    return
  }

  const output = `dist/${unsigned ? 'unsigned' : 'release'}/${arch}`
  const environment = { ...process.env }
  const builderArgs = [
    'exec',
    'electron-builder',
    '--mac',
    `--${arch}`,
    '--publish',
    'never',
    `--config.directories.output=${output}`
  ]
  if (unsigned) {
    delete environment.CSC_LINK
    delete environment.CSC_KEY_PASSWORD
    environment.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
    builderArgs.push(
      '--config.forceCodeSigning=false',
      '--config.mac.identity=-',
      '--config.mac.hardenedRuntime=false',
      '--config.mac.notarize=false',
      '--config.dmg.sign=false',
      '--config.artifactName=Halfspace-${version}-${arch}-unsigned.${ext}'
    )
  }

  run('pnpm', ['build'])
  run('pnpm', ['icon:mac'])
  run('pnpm', builderArgs, environment)

  const { version } = JSON.parse(await readFile('package.json', 'utf8'))
  const name = `Halfspace-${version}-${arch}${unsigned ? '-unsigned' : ''}`
  const dmg = `${output}/${name}.dmg`
  const zip = `${output}/${name}.zip`
  const app = `${output}/${arch === 'arm64' ? 'mac-arm64' : 'mac'}/Halfspace.app`
  run('hdiutil', ['verify', dmg])
  run('unzip', ['-tq', zip])

  if (!unsigned) {
    verifyDeveloperSignature(app)
    run('xcrun', ['stapler', 'validate', app])
    run('spctl', ['--assess', '--type', 'execute', '--verbose=2', app])
    verifyDeveloperSignature(dmg)

    // The app is already notarized and stapled by electron-builder. Submit the signed
    // disk image too, so its ticket remains available when a tester installs offline.
    const submission = spawnSync(
      'xcrun',
      [
        'notarytool',
        'submit',
        dmg,
        '--apple-id',
        process.env.APPLE_ID,
        '--password',
        process.env.APPLE_APP_SPECIFIC_PASSWORD,
        '--team-id',
        process.env.APPLE_TEAM_ID,
        '--wait',
        '--output-format',
        'json'
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
    )
    if (submission.status !== 0)
      throw new Error('Disk image notarization failed. See the Apple error above.')
    const result = JSON.parse(submission.stdout)
    if (result.status !== 'Accepted') {
      throw new Error(`Disk image notarization ${result.status} (${result.id}).`)
    }
    run('xcrun', ['stapler', 'staple', dmg])
    run('xcrun', ['stapler', 'validate', dmg])
    run('spctl', ['--assess', '--type', 'open', '--context', 'context:primary-signature', dmg])
  }

  const checksums = []
  for (const extension of ['dmg', 'zip']) {
    const filename = `${name}.${extension}`
    const digest = createHash('sha256')
      .update(await readFile(`${output}/${filename}`))
      .digest('hex')
    checksums.push(`${digest}  ${filename}`)
  }
  await writeFile(`${output}/${name}.sha256`, `${checksums.join('\n')}\n`)
  console.log(
    `${unsigned ? 'Local unsigned packages' : 'Signed and notarized packages'}: ${output}`
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  packageMac().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
