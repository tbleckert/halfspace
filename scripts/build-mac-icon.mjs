import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { Resvg } from '@resvg/resvg-js'

const logo = await readFile(new URL('../resources/halfspace-logo.svg', import.meta.url), 'utf8')
// Preserve the canonical artwork inside the inset, rounded macOS icon surface.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs><clipPath id="surface"><rect x="100" y="100" width="824" height="824" rx="184"/></clipPath></defs>
  <g clip-path="url(#surface)"><g transform="translate(100 100) scale(0.8046875)">${logo}</g></g>
</svg>`

await mkdir('build/icon.iconset', { recursive: true })
for (const size of [16, 32, 128, 256, 512]) {
  for (const scale of [1, 2]) {
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: size * scale } }).render()
    const suffix = scale === 2 ? '@2x' : ''
    await writeFile(`build/icon.iconset/icon_${size}x${size}${suffix}.png`, png.asPng())
  }
}

execFileSync('iconutil', ['--convert', 'icns', '--output', 'build/icon.icns', 'build/icon.iconset'])
console.log('Generated build/icon.icns from resources/halfspace-logo.svg')
