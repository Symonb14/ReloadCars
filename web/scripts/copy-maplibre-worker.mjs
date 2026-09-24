/**
 * MapLibre 6 loads its Web Worker from a file next to its own bundle
 * (new URL('./maplibre-gl-worker.mjs', import.meta.url)). Turbopack does not emit that
 * file, so we serve it from /public and point MapLibre to it with setWorkerUrl()
 * (see src/components/charge-points/location-picker.tsx).
 *
 * Runs before `dev` and `build`, so the copy always matches the installed version.
 */
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'node_modules', 'maplibre-gl', 'dist')
const target = join(root, 'public', 'maplibre')

mkdirSync(target, { recursive: true })

// The worker imports the shared chunk from the same folder.
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(source, file), join(target, file))
}

console.log('MapLibre worker copied to public/maplibre')
