import { mkdir } from 'node:fs/promises'

import { build } from 'esbuild'

await mkdir('dist/electron', { recursive: true })

// Main process stays ESM (package.json has "type": "module").
await build({
  bundle: true,
  entryPoints: ['electron/main.ts'],
  format: 'esm',
  outfile: 'dist/electron/main.js',
  platform: 'node',
  sourcemap: true,
  target: 'node24',
  external: ['electron']
})

// Preload must be CommonJS because Electron loads it outside the ESM graph.
await build({
  bundle: true,
  entryPoints: ['electron/preload.ts'],
  format: 'cjs',
  outfile: 'dist/electron/preload.cjs',
  platform: 'node',
  sourcemap: true,
  target: 'node24',
  external: ['electron']
})

console.log('electron main + preload bundled -> dist/electron')
