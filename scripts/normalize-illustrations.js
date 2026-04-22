#!/usr/bin/env node
/**
 * normalize-illustrations.js
 *
 * Normalizes SVG files in public/illustrations/ for currentColor theming.
 * Run from repo root: node scripts/normalize-illustrations.js
 *
 * Place SVGs first:
 *   public/illustrations/open-doodles/   ← from https://github.com/draftbit/open-doodles
 *   public/illustrations/highlights/      ← from https://highlights.design
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const ILL_DIR = join(ROOT, 'public', 'illustrations')
const SOURCES = ['open-doodles', 'humaans', 'open-peeps']

const BLACK_VALS = ['#000', '#000000', '#1a1a1a', '#111', '#111111', '#222', '#222222', 'black']

function normalizeSvg(text) {
  let s = text

  // Strip width/height from root <svg> tag only (first occurrence)
  s = s.replace(/(<svg\b[^>]*?)\s+width=["'][^"']*["']/i, '$1')
  s = s.replace(/(<svg\b[^>]*?)\s+height=["'][^"']*["']/i, '$1')

  for (const val of BLACK_VALS) {
    const esc = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // stroke="black" / stroke='black'
    s = s.replace(new RegExp(`stroke=["']${esc}["']`, 'gi'), 'stroke="currentColor"')
    // fill="black" — but NOT fill="none" or fill="white" (those are already excluded by the value match)
    s = s.replace(new RegExp(`fill=["']${esc}["']`, 'gi'), 'fill="currentColor"')
    // inline style stroke:black
    s = s.replace(new RegExp(`(style=["'][^"']*)stroke\\s*:\\s*${esc}`, 'gi'), '$1stroke:currentColor')
    // inline style fill:black
    s = s.replace(new RegExp(`(style=["'][^"']*)fill\\s*:\\s*${esc}`, 'gi'), '$1fill:currentColor')
  }

  return s
}

function toName(filename) {
  return basename(filename, extname(filename))
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function toTags(filename) {
  return basename(filename, extname(filename))
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter(t => t.length > 1)
}

function extractViewBox(svg) {
  const m = svg.match(/viewBox=["']([^"']*)["']/i)
  return m ? m[1] : '0 0 500 500'
}

const manifest = []

for (const source of SOURCES) {
  const dir = join(ILL_DIR, source)
  if (!existsSync(dir)) {
    console.log(`⚠  ${source}/ not found — skipping`)
    continue
  }
  const files = readdirSync(dir).filter(f => /\.svg$/i.test(f)).sort()
  console.log(`Processing ${source}/ — ${files.length} files`)

  for (const file of files) {
    const filePath = join(dir, file)
    try {
      const original = readFileSync(filePath, 'utf8')
      const normalized = normalizeSvg(original)
      if (normalized !== original) writeFileSync(filePath, normalized, 'utf8')

      manifest.push({
        id: `${source}/${basename(file, '.svg')}`,
        source,
        path: `/illustrations/${source}/${file}`,
        name: toName(file),
        tags: toTags(file),
        viewBox: extractViewBox(normalized),
      })
      process.stdout.write('.')
    } catch (err) {
      console.error(`\n  ✗ ${file}: ${err.message}`)
    }
  }
  console.log()
}

writeFileSync(join(ILL_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`\n✓ manifest.json — ${manifest.length} illustrations`)
