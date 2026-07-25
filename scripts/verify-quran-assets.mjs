#!/usr/bin/env node
//
// Post-build gate: refuse to ship a bundle without the mushaf corpus.
//
// The page data and per-page fonts are gitignored and produced by
// `pnpm setup:quran`. A deploy that skips that step still builds and still
// boots — the assets 404, the host answers with the SPA shell (200,
// `text/html`), and every recitation screen shows "تعذّر عرض الصفحة N". The
// failure only surfaces in the browser, so it ships unnoticed.
//
// Run:    node scripts/verify-quran-assets.mjs [--dir <path>]
// Checks: .output/public/quran by default, i.e. what actually gets deployed.
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const dirFlag = process.argv.indexOf('--dir')
const BASE = resolve(ROOT, dirFlag === -1 ? '.output/public/quran' : process.argv[dirFlag + 1])

const TOTAL_PAGES = 604
// The smallest real files in the corpus are ~1.5KB (page JSON) and ~14KB
// (font). The SPA shell an absent file resolves to is ~3-7KB, so size alone
// cannot separate them — this only catches truncated or empty writes.
const MIN_JSON_BYTES = 512
const MIN_FONT_BYTES = 4096

async function sizeOf(path) {
  try {
    const s = await stat(path)
    return s.isFile() ? s.size : -1
  } catch {
    return -1
  }
}

async function checkGroup(label, pathFor, minBytes) {
  const missing = []
  const undersized = []
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const size = await sizeOf(pathFor(page))
    if (size < 0) missing.push(page)
    else if (size < minBytes) undersized.push(page)
  }
  return { label, missing, undersized }
}

function summarize(pages) {
  const head = pages.slice(0, 8).join(', ')
  return pages.length > 8 ? `${head}, … (${pages.length} total)` : head
}

const results = await Promise.all([
  checkGroup('page data', page => resolve(BASE, `pages/${page}.json`), MIN_JSON_BYTES),
  checkGroup('page fonts', page => resolve(BASE, `fonts/v1/p${page}.woff2`), MIN_FONT_BYTES)
])

const broken = results.filter(r => r.missing.length || r.undersized.length)

if (!broken.length) {
  console.log(`✔ mushaf assets present: ${TOTAL_PAGES} page JSONs + ${TOTAL_PAGES} fonts in ${BASE}`)
  process.exit(0)
}

console.error(`\n✖ Mushaf assets incomplete in ${BASE}\n`)
for (const { label, missing, undersized } of broken) {
  if (missing.length) console.error(`  ${label} — missing ${missing.length}: ${summarize(missing)}`)
  if (undersized.length) console.error(`  ${label} — truncated ${undersized.length}: ${summarize(undersized)}`)
}
console.error(`
  These files are gitignored and built, not committed. Run:

      pnpm setup:quran

  before \`nuxt build\`. Without them every recitation page renders
  "تعذّر عرض الصفحة N" for users, while the build itself looks fine.
`)
process.exit(1)
