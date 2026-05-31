// Converts public/og-image.svg → public/og-image.png (1200×630)
// Run once: node scripts/generate-og.mjs
// Requires: npm install -D sharp

import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir  = join(__dirname, '..', 'public')

const svg = readFileSync(join(publicDir, 'og-image.svg'))

await sharp(svg, { density: 150 })
  .resize(1200, 630)
  .png({ compressionLevel: 9 })
  .toFile(join(publicDir, 'og-image.png'))

console.log('✓ public/og-image.png generated (1200×630)')
