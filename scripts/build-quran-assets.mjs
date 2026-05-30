#!/usr/bin/env node
/*
  One-time asset builder. Produces three things under public/quran/:
    - pages/{1..604}.json       compact word data per mushaf page
    - meta/verse-to-page.json   verse_key → page lookup (6,236 entries)
    - fonts/v1/p{1..604}.woff2  KFGQPC v1 (1405H print) glyph fonts, one per page

  Self-hosting the fonts (instead of pointing at Tarteel's CDN at runtime)
  removes the per-page TLS + DNS handshake. With local fonts a first page
  visit drops from ~2s to <50ms, and the browser cache makes repeat
  navigations instant.

  The data is fetched for the KFGQPC v1 mushaf layout — Quran.com's
  api.quran.com/api/v4 returns `code_v1` glyph codes alongside the
  v1-layout page/line numbers when we ask for them explicitly.

  Run:        node scripts/build-quran-assets.mjs
  Re-run:     safe — skips files that already exist. Pass --force to redo.
  JSON only:  --skip-fonts. Fonts only: --skip-json.
*/

import { mkdir, writeFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PAGES_DIR = resolve(ROOT, 'public/quran/pages')
const META_DIR = resolve(ROOT, 'public/quran/meta')
const FONTS_DIR = resolve(ROOT, 'public/quran/fonts/v1')

const TOTAL_PAGES = 604
const CONCURRENCY = 6
const RETRY_LIMIT = 3
const RETRY_DELAY_MS = 1500
const FORCE = process.argv.includes('--force')
const SKIP_FONTS = process.argv.includes('--skip-fonts')
const SKIP_JSON = process.argv.includes('--skip-json')

const API_BASE = 'https://api.quran.com/api/v4'
// QUL distributes the v1 fonts under the `v1-optimized` directory — the
// "optimized" build hints/subsets are what Quran.com uses in production.
const FONT_CDN = 'https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1-optimized/woff2'

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchPage(pageNumber, attempt = 1) {
  const url =
    `${API_BASE}/verses/by_page/${pageNumber}` +
    `?words=true` +
    // mushaf=2 selects the v1 (KFGQPC 1405H) layout — page/line numbers
    // come back tied to that print. code_v1 holds the matching glyph.
    `&mushaf=2` +
    `&word_fields=code_v1,line_number,position,char_type_name,text_uthmani` +
    `&per_page=50`

  const res = await fetch(url)
  if (!res.ok) {
    if (attempt < RETRY_LIMIT) {
      await sleep(RETRY_DELAY_MS * attempt)
      return fetchPage(pageNumber, attempt + 1)
    }
    throw new Error(`page ${pageNumber}: HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Convert Quran.com response into our compact wire format. Each word is a
 * tuple to avoid repeating object keys; verse_key is hoisted to the LINE
 * level when every word on a line belongs to the same verse (the common
 * case — ~85% of mushaf lines).
 *
 * Disk shape:
 *   { page, surahs: number[], verses: string[],
 *     lines: [
 *       { n, k: "1:1", w: [["ﭑ",1], ["ﭕ",5,"e"]] },     // hoisted (single verse)
 *       { n, w: [["ﱋ","1:3",1], ["ﱎ","1:4",1]] }       // not hoisted (multi-verse line)
 *     ]
 *   }
 *
 * Each `w` tuple:
 *   - line-level k present: [char, position]            or [char, position, type]
 *   - line-level k absent:  [char, verseKey, position]  or [char, verseKey, position, type]
 *
 * useMushafPage's loadPageJson() normalizes back to {c,k,p,t} objects so
 * downstream code stays unchanged.
 */
function compactPage(pageNumber, apiResponse) {
  const verses = apiResponse.verses ?? []
  const surahs = new Set()
  const verseKeys = []
  // line_number -> [{ c, k, p, t? }] in reading order
  const lineMap = new Map()

  for (const verse of verses) {
    verseKeys.push(verse.verse_key)
    surahs.add(Number(verse.verse_key.split(':')[0]))
    for (const word of verse.words ?? []) {
      const lineNo = word.line_number
      if (!lineMap.has(lineNo)) lineMap.set(lineNo, [])
      const entry = {
        c: word.code_v1,
        k: verse.verse_key,
        p: word.position
      }
      const type = word.char_type_name
      if (type && type !== 'word') entry.t = type[0]
      lineMap.get(lineNo).push(entry)
    }
  }

  // Word reading order on a line = the order the API returned them.
  // The API returns verses ascending and words ascending within each verse,
  // which matches mushaf reading order. Sorting by p (position-in-verse)
  // would interleave words across verses incorrectly.
  const lines = Array.from(lineMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([n, words]) => compactLine(n, words))

  return {
    page: pageNumber,
    surahs: Array.from(surahs).sort((a, b) => a - b),
    verses: verseKeys,
    lines
  }
}

/**
 * Convert one line's word objects into the wire-tuple format described
 * above compactPage(). Hoists `k` to the line when every word shares it.
 */
function compactLine(n, words) {
  const allSameVerse = words.every(w => w.k === words[0].k)
  if (allSameVerse) {
    const k = words[0].k
    const w = words.map(word => word.t ? [word.c, word.p, word.t] : [word.c, word.p])
    return { n, k, w }
  }
  const w = words.map(word => word.t ? [word.c, word.k, word.p, word.t] : [word.c, word.k, word.p])
  return { n, w }
}

async function buildOnePage(pageNumber) {
  const out = resolve(PAGES_DIR, `${pageNumber}.json`)
  if (!FORCE && (await fileExists(out))) {
    return { pageNumber, skipped: true }
  }
  const api = await fetchPage(pageNumber)
  const data = compactPage(pageNumber, api)
  await writeFile(out, JSON.stringify(data))
  return { pageNumber, skipped: false, lines: data.lines.length, verses: data.verses.length }
}

async function downloadFont(pageNumber, attempt = 1) {
  const out = resolve(FONTS_DIR, `p${pageNumber}.woff2`)
  if (!FORCE && (await fileExists(out))) return { pageNumber, skipped: true }
  const url = `${FONT_CDN}/p${pageNumber}.woff2`
  const res = await fetch(url)
  if (!res.ok) {
    if (attempt < RETRY_LIMIT) {
      await sleep(RETRY_DELAY_MS * attempt)
      return downloadFont(pageNumber, attempt + 1)
    }
    throw new Error(`font p${pageNumber}: HTTP ${res.status}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(out, buf)
  return { pageNumber, skipped: false, bytes: buf.length }
}

async function buildVerseToPage() {
  // Walk all per-page JSONs and emit a single { "1:1": 1, "1:2": 1, ... } map.
  const map = {}
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    const path = resolve(PAGES_DIR, `${p}.json`)
    if (!(await fileExists(path))) continue
    const { verses } = JSON.parse(await (await import('node:fs/promises')).readFile(path, 'utf8'))
    for (const key of verses) {
      if (!(key in map)) map[key] = p
    }
  }
  await writeFile(resolve(META_DIR, 'verse-to-page.json'), JSON.stringify(map))
  console.log(`✓ verse-to-page.json (${Object.keys(map).length} entries)`)
}

async function buildPagesBundle() {
  // Roll all 604 per-page JSONs into a single bundle. The client fetches it
  // once during idle time after first paint, then per-page JSON lookups are
  // synchronous Map reads forever — no more cold-fetch latency for pages
  // the user hasn't visited yet. Per-page files stay on disk so anything
  // that requests one URL still works (preload hints, partial prefetch).
  //
  // Size budget: 604 pages × ~4.5 KB ≈ 2.7 MB raw, ~900 KB gzipped over
  // the wire. Worth it because it converts an open-ended N-fetch problem
  // into one bounded request.
  const { readFile } = await import('node:fs/promises')
  const pages = []
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    const path = resolve(PAGES_DIR, `${p}.json`)
    if (!(await fileExists(path))) continue
    pages.push(JSON.parse(await readFile(path, 'utf8')))
  }
  const out = resolve(META_DIR, 'pages-all.json')
  const json = JSON.stringify(pages)
  await writeFile(out, json)
  console.log(`✓ pages-all.json (${pages.length} pages, ${(json.length / 1024).toFixed(0)} KB raw)`)
}

async function runQueue(label, fetcher) {
  const queue = []
  for (let i = 1; i <= TOTAL_PAGES; i++) queue.push(i)
  let done = 0
  let skipped = 0
  const errors = []

  async function worker() {
    while (queue.length) {
      const pageNumber = queue.shift()
      try {
        const r = await fetcher(pageNumber)
        if (r.skipped) skipped++
        done++
        if (done % 50 === 0 || done === TOTAL_PAGES) {
          process.stdout.write(`  ${label}: ${done}/${TOTAL_PAGES} (${skipped} skipped)\n`)
        }
      } catch (err) {
        errors.push({ pageNumber, message: err.message })
        process.stderr.write(`  ✗ ${label} ${pageNumber}: ${err.message}\n`)
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return errors
}

async function main() {
  await mkdir(PAGES_DIR, { recursive: true })
  await mkdir(META_DIR, { recursive: true })
  await mkdir(FONTS_DIR, { recursive: true })

  const flags = [
    FORCE && 'force',
    SKIP_JSON && 'skip-json',
    SKIP_FONTS && 'skip-fonts'
  ].filter(Boolean).join(', ')
  console.log(`Building mushaf assets (concurrency=${CONCURRENCY}${flags ? ', ' + flags : ''})`)

  const allErrors = []
  if (!SKIP_JSON) {
    console.log(`\nPages JSON → ${PAGES_DIR}`)
    allErrors.push(...await runQueue('json', buildOnePage))
    await buildVerseToPage()
  }
  if (!SKIP_FONTS) {
    console.log(`\nFonts → ${FONTS_DIR}`)
    allErrors.push(...await runQueue('font', downloadFont))
  }
  // Always (re)emit the all-pages bundle from whatever per-page JSONs are
  // on disk. Cheap (~1s of disk reads) and keeps it in sync whether the
  // user ran the full build or just refreshed individual pages.
  await buildPagesBundle()

  if (allErrors.length) {
    console.error(`\n${allErrors.length} item(s) failed. Re-run to retry.`)
    process.exit(1)
  }

  console.log('\n✓ Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
