#!/usr/bin/env node
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

function compactPage(pageNumber, apiResponse) {
  const verses = apiResponse.verses ?? []
  const surahs = new Set()
  const verseKeys = []
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

async function fetchPageMeta(pageNumber, attempt = 1) {
  const url =
    `${API_BASE}/verses/by_page/${pageNumber}` +
    `?fields=juz_number,hizb_number,rub_el_hizb_number` +
    `&mushaf=2&per_page=50`
  const res = await fetch(url)
  if (!res.ok) {
    if (attempt < RETRY_LIMIT) {
      await sleep(RETRY_DELAY_MS * attempt)
      return fetchPageMeta(pageNumber, attempt + 1)
    }
    throw new Error(`page-meta ${pageNumber}: HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.verses ?? []
}

// Per-ayah word-entry counts, in mushaf order (index 0 = Al-Fatihah:1). The
// frontend prefix-sums this to turn a (surah, ayah, position) mark into a stable,
// monotonic QUL-order word id for achievement error locations. We count every
// word entry (real words + end/pause markers) so the id lines up with QUL's
// 1-based per-verse `position` exactly.
async function buildWordCounts() {
  const out = resolve(META_DIR, 'word-counts.json')
  const { readFile } = await import('node:fs/promises')
  const perVerse = new Map()
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    const path = resolve(PAGES_DIR, `${p}.json`)
    if (!(await fileExists(path))) continue
    const page = JSON.parse(await readFile(path, 'utf8'))
    for (const line of page.lines ?? []) {
      const words = line.w ?? []
      if (line.k !== undefined) {
        // Same-verse line: every entry belongs to line.k.
        perVerse.set(line.k, (perVerse.get(line.k) ?? 0) + words.length)
      } else {
        // Mixed line: each entry carries its own verse key at index 1.
        for (const w of words) {
          const vk = w[1]
          perVerse.set(vk, (perVerse.get(vk) ?? 0) + 1)
        }
      }
    }
  }

  const keys = [...perVerse.keys()].sort((a, b) => {
    const [as, av] = a.split(':').map(Number)
    const [bs, bv] = b.split(':').map(Number)
    return as - bs || av - bv
  })
  const wordCounts = keys.map(k => perVerse.get(k))
  await writeFile(out, JSON.stringify({ wordCounts }))
  const total = wordCounts.reduce((a, b) => a + b, 0)
  console.log(`✓ word-counts.json (${wordCounts.length} ayat, ${total} word entries)`)
  if (wordCounts.length !== 6236) {
    console.warn(`  ⚠ expected 6236 ayat, got ${wordCounts.length} — pages may be incomplete.`)
  }
}

async function buildQuranStructure() {
  const out = resolve(META_DIR, 'quran-structure.json')
  if (!FORCE && (await fileExists(out))) {
    console.log('✓ quran-structure.json (exists — pass --force to rebuild)')
    return []
  }

  const byPage = new Map()
  const queue = []
  for (let p = 1; p <= TOTAL_PAGES; p++) queue.push(p)
  const errors = []
  let done = 0
  async function worker() {
    while (queue.length) {
      const p = queue.shift()
      try {
        byPage.set(p, await fetchPageMeta(p))
        if (++done % 100 === 0 || done === TOTAL_PAGES) {
          process.stdout.write(`  structure: ${done}/${TOTAL_PAGES}\n`)
        }
      } catch (err) {
        errors.push({ pageNumber: p, message: err.message })
        process.stderr.write(`  ✗ structure ${p}: ${err.message}\n`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  if (errors.length) return errors

  const pageStarts = []
  const juzStarts = []
  const hizbStarts = []
  const rubStarts = []
  const seenJuz = new Set()
  const seenHizb = new Set()
  const seenRub = new Set()

  for (let p = 1; p <= TOTAL_PAGES; p++) {
    const verses = byPage.get(p) ?? []
    verses.forEach((v, i) => {
      if (i === 0) pageStarts.push(v.verse_key)
      if (!seenJuz.has(v.juz_number)) { seenJuz.add(v.juz_number); juzStarts.push(v.verse_key) }
      if (!seenHizb.has(v.hizb_number)) { seenHizb.add(v.hizb_number); hizbStarts.push(v.verse_key) }
      if (!seenRub.has(v.rub_el_hizb_number)) { seenRub.add(v.rub_el_hizb_number); rubStarts.push(v.verse_key) }
    })
  }

  await writeFile(out, JSON.stringify({ pageStarts, juzStarts, hizbStarts, rubStarts }))
  console.log(
    `✓ quran-structure.json (${pageStarts.length} pages, ${juzStarts.length} juz, ` +
    `${hizbStarts.length} hizb, ${rubStarts.length} rub)`
  )
  return []
}

async function buildPagesBundle() {
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
    await buildWordCounts()
    console.log(`\nStructure (page/juz/hizb/rub boundaries) → ${META_DIR}`)
    allErrors.push(...await buildQuranStructure())
  }
  if (!SKIP_FONTS) {
    console.log(`\nFonts → ${FONTS_DIR}`)
    allErrors.push(...await runQueue('font', downloadFont))
  }
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
