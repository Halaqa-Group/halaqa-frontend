#!/usr/bin/env node
/*
  Rebuilds public/quran/pages/{1..604}.json from the QUL "KFGQPC V1 layout (1405H
  print)" resource (https://qul.tarteel.ai/resources/mushaf-layout/15), so the
  line breaks + centering match the printed mushaf exactly (fixing pages where
  quran.com's line grouping differs from KFGQPC).

  Strategy — take the *layout* from QUL, keep *our* glyphs/fonts:
    - QUL's `pages` table decides each line's type (ayah / surah_name / basmallah),
      whether it's centered, and which words it holds (first_word_id..last_word_id).
    - QUL's `words` table maps each word id → word_key ("surah:ayah:position").
    - Our existing pages-all.json already has the code_v1 glyph for every
      (verse_key, position). We look the glyph up by word_key, so we never depend
      on what QUL stores in words.text (which may be text, not code_v1 glyphs).

  Output wire line shape (consumed by useMushafPage/synthesizeLines):
    { n, lt: 'ayah',       c: bool, w: [[glyph, "s:a", pos, type?], ...] }
    { n, lt: 'surah_name', c: bool, sn: surahNumber }
    { n, lt: 'basmallah',  c: bool }

  Prereq: drop the QUL sqlite export at scripts/data/qpc-v1-layout-15.sqlite
  Run:    node --experimental-sqlite scripts/build-mushaf-layout.mjs
*/
import { DatabaseSync } from 'node:sqlite'
import { readFile, writeFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DB_PATH = resolve(__dirname, 'data/qpc-v1-layout-15.sqlite')
const WORDS_DB_PATH = resolve(__dirname, 'data/qpc-v1-words.sqlite')
const PAGES_DIR = resolve(ROOT, 'public/quran/pages')
const META_DIR = resolve(ROOT, 'public/quran/meta')
const PAGES_ALL = resolve(META_DIR, 'pages-all.json')
const VERSE_TO_PAGE = resolve(META_DIR, 'verse-to-page.json')
const QURAN_STRUCTURE = resolve(META_DIR, 'quran-structure.json')
const TOTAL_PAGES = 604

async function fileExists(p) {
  try { await access(p); return true } catch { return false }
}

/** Case-insensitive column lookup so minor schema naming differences don't break us. */
function pickColumn(columns, candidates) {
  const lower = new Map(columns.map(c => [c.toLowerCase(), c]))
  for (const cand of candidates) {
    const hit = lower.get(cand.toLowerCase())
    if (hit) return hit
  }
  return null
}

function tableColumns(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name)
}

/** (verse_key, position) → { c: glyph, t?: type } from our existing assets. */
async function buildGlyphMap() {
  const raw = JSON.parse(await readFile(PAGES_ALL, 'utf8'))
  const map = new Map()
  for (const page of raw) {
    for (const line of page.lines ?? []) {
      for (const w of line.w ?? []) {
        let c, k, p, t
        if (line.k) {
          // hoisted: [char, position] | [char, position, type]
          c = w[0]; p = w[1]; t = w[2]; k = line.k
        } else {
          // [char, verseKey, position] | [char, verseKey, position, type]
          c = w[0]; k = w[1]; p = w[2]; t = w[3]
        }
        map.set(`${k}:${p}`, t ? { c, t } : { c })
      }
    }
  }
  return map
}

function normalizeLineType(raw) {
  const v = String(raw ?? '').toLowerCase()
  if (v.includes('surah')) return 'surah_name'
  if (v.includes('bism') || v.includes('basm')) return 'basmallah'
  return 'ayah'
}

async function main() {
  if (!(await fileExists(DB_PATH))) {
    console.error(`✗ QUL sqlite not found at:\n    ${DB_PATH}\n`
      + `  Download the SQLite export of mushaf-layout #15 from qul.tarteel.ai `
      + `(free login) and place it there, then re-run.`)
    process.exit(1)
  }
  if (!(await fileExists(PAGES_ALL))) {
    console.error(`✗ ${PAGES_ALL} missing — run "pnpm build:quran" first (it produces the glyphs).`)
    process.exit(1)
  }

  console.log('Loading existing glyphs from pages-all.json…')
  const glyphs = await buildGlyphMap()
  console.log(`  ${glyphs.size} word glyphs indexed`)

  const layoutDb = new DatabaseSync(DB_PATH, { readOnly: true })

  const listTables = d => d.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name)
  const findTable = (d, tables, preferred, requiredCols) => {
    for (const name of preferred) if (tables.includes(name)) return name
    for (const name of tables) {
      const cols = tableColumns(d, name).map(c => c.toLowerCase())
      if (requiredCols.every(rc => cols.includes(rc))) return name
    }
    return null
  }
  const findWordsTable = (d, tables) =>
    findTable(d, tables, ['words', 'mushaf_words', 'word', 'qpc_words', 'glyphs', 'word_by_word'], ['word_key'])
    || findTable(d, tables, [], ['surah', 'ayah', 'text'])

  // ── Layout (#15) → pages table ──────────────────────────────────────────────
  const layoutTables = listTables(layoutDb)
  console.log('Layout DB tables:', layoutTables.join(', ') || '(none)')
  const pagesTable = findTable(layoutDb, layoutTables, ['pages'], ['line_type', 'first_word_id'])
  if (!pagesTable) throw new Error(`No layout "pages" table found. Tables: [${layoutTables}]`)

  // ── Words: same file if bundled, else the #57 words export ──────────────────
  let wordsDb = layoutDb
  let wordsTable = findWordsTable(layoutDb, layoutTables)
  if (!wordsTable) {
    if (!(await fileExists(WORDS_DB_PATH))) {
      console.error(
        `\n✗ The layout ("${pagesTable}") has no words table, so first_word_id/last_word_id`
        + ` can't be mapped to verse:position.\n`
        + `  Layout tables: ${layoutTables.join(', ')}\n`
        + `  Download QUL's "QPC V1 Glyphs - Word by Word" (#57) sqlite and save it at:\n`
        + `    ${WORDS_DB_PATH}\n`
        + `  then re-run.`
      )
      process.exit(1)
    }
    wordsDb = new DatabaseSync(WORDS_DB_PATH, { readOnly: true })
    const wordsDbTables = listTables(wordsDb)
    console.log('Words DB tables:', wordsDbTables.join(', ') || '(none)')
    wordsTable = findWordsTable(wordsDb, wordsDbTables)
    if (!wordsTable) throw new Error(`No words table in ${WORDS_DB_PATH}. Tables: [${wordsDbTables}]`)
  }
  console.log(`Using pages="${pagesTable}", words="${wordsTable}"${wordsDb === layoutDb ? '' : ' (from words DB)'}.`)

  const pageCols = tableColumns(layoutDb, pagesTable)
  const wordCols = tableColumns(wordsDb, wordsTable)
  const col = {
    page: pickColumn(pageCols, ['page_number', 'page', 'page_id']),
    line: pickColumn(pageCols, ['line_number', 'line', 'line_no']),
    type: pickColumn(pageCols, ['line_type', 'type']),
    centered: pickColumn(pageCols, ['is_centered', 'centered', 'is_center']),
    firstWord: pickColumn(pageCols, ['first_word_id', 'first_word', 'from_word_id']),
    lastWord: pickColumn(pageCols, ['last_word_id', 'last_word', 'to_word_id']),
    surah: pickColumn(pageCols, ['surah_number', 'surah_id', 'surah']),
    wordId: pickColumn(wordCols, ['id', 'word_index', 'word_id']),
    wordKey: pickColumn(wordCols, ['word_key', 'key', 'location']),
    wSurah: pickColumn(wordCols, ['surah', 'surah_number', 'sura']),
    wAyah: pickColumn(wordCols, ['ayah', 'verse', 'aya']),
    wPos: pickColumn(wordCols, ['position', 'word_position', 'pos', 'word_number']),
    charType: pickColumn(wordCols, ['char_type', 'char_type_name', 'type'])
  }
  for (const k of ['page', 'line', 'type', 'firstWord', 'lastWord', 'wordId']) {
    if (!col[k]) throw new Error(`Missing "${k}" column. pages=[${pageCols}] words=[${wordCols}]`)
  }
  if (!col.wordKey && !(col.wSurah && col.wAyah && col.wPos)) {
    throw new Error(`words table lacks word_key and surah/ayah/position columns: [${wordCols}]`)
  }

  // A words-table row → { k: "surah:ayah", p, glyph, ct }
  const wordRowToWord = (row) => {
    let s, a, p
    if (col.wordKey && row[col.wordKey] != null) {
      [s, a, p] = String(row[col.wordKey]).split(':')
    } else {
      s = row[col.wSurah]; a = row[col.wAyah]; p = row[col.wPos]
    }
    const k = `${s}:${a}`
    return { k, p: Number(p), glyph: glyphs.get(`${k}:${Number(p)}`), ct: col.charType ? row[col.charType] : null }
  }
  const wordRangeStmt = wordsDb.prepare(
    `SELECT * FROM ${wordsTable} WHERE ${col.wordId} BETWEEN ? AND ? ORDER BY ${col.wordId}`
  )

  // ── pages → lines ───────────────────────────────────────────────────────────
  const byPage = new Map()
  for (const row of layoutDb.prepare(`SELECT * FROM ${pagesTable} ORDER BY ${col.page}, ${col.line}`).all()) {
    const page = Number(row[col.page])
    if (!byPage.has(page)) byPage.set(page, [])
    byPage.get(page).push(row)
  }

  let missingGlyphs = 0
  let written = 0
  const allPages = []
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const rows = byPage.get(page)
    if (!rows) continue
    const surahs = new Set()
    const pageVerses = new Set()
    const lines = []

    for (const row of rows) {
      const n = Number(row[col.line])
      const lt = normalizeLineType(row[col.type])
      const c = !!Number(row[col.centered])

      if (lt === 'surah_name') {
        const sn = Number(row[col.surah])
        surahs.add(sn)
        lines.push({ n, lt, c, sn })
        continue
      }
      if (lt === 'basmallah') {
        lines.push({ n, lt, c })
        continue
      }

      // ayah line — the words are the words-table rows whose id falls in the
      // [first_word_id, last_word_id] range (exactly like QUL's getWords()).
      const first = Number(row[col.firstWord])
      const last = Number(row[col.lastWord])
      const w = []
      const verseSet = new Set()
      for (const wr of wordRangeStmt.all(first, last)) {
        const { k, p, glyph, ct } = wordRowToWord(wr)
        surahs.add(Number(k.split(':')[0]))
        verseSet.add(k)
        if (!glyph) { missingGlyphs++; continue }
        const t = glyph.t ?? (ct && ct !== 'word' ? String(ct)[0] : undefined)
        w.push(t ? [glyph.c, k, p, t] : [glyph.c, k, p])
      }
      for (const vk of verseSet) pageVerses.add(vk)
      lines.push({ n, lt, c, w })
    }

    const out = {
      page,
      surahs: Array.from(surahs).sort((a, b) => a - b),
      verses: Array.from(pageVerses),
      lines
    }
    await writeFile(resolve(PAGES_DIR, `${page}.json`), JSON.stringify(out))
    allPages.push(out)
    written++
    if (written % 100 === 0) console.log(`  ${written} pages written`)
  }

  layoutDb.close()
  if (wordsDb !== layoutDb) wordsDb.close()

  await writeFile(PAGES_ALL, JSON.stringify(allPages))

  await writeBoundaryMeta(allPages)

  console.log(`✓ Wrote ${written} pages + refreshed pages-all.json.`
    + (missingGlyphs ? ` (${missingGlyphs} words had no matching glyph — check word_key alignment)` : ''))
}

async function writeBoundaryMeta(allPages) {
  const pages = [...allPages].sort((a, b) => a.page - b.page)

  const verseToPage = {}
  const pageStarts = []
  for (const pg of pages) {
    const verses = pg.verses ?? []
    if (verses.length) pageStarts.push(verses[0])
    for (const vk of verses) {
      if (!(vk in verseToPage)) verseToPage[vk] = pg.page
    }
  }

  await writeFile(VERSE_TO_PAGE, JSON.stringify(verseToPage))

  let structure = { pageStarts: [], juzStarts: [], hizbStarts: [], rubStarts: [] }
  if (await fileExists(QURAN_STRUCTURE)) {
    try {
      structure = { ...structure, ...JSON.parse(await readFile(QURAN_STRUCTURE, 'utf8')) }
    } catch {
      // corrupt/partial file — fall back to empty juz/hizb/rub
    }
  }
  structure.pageStarts = pageStarts
  await writeFile(QURAN_STRUCTURE, JSON.stringify(structure))

  console.log(`✓ verse-to-page.json (${Object.keys(verseToPage).length} verses)`
    + ` + quran-structure.json (${pageStarts.length} page starts`
    + (structure.juzStarts?.length ? `, ${structure.juzStarts.length} juz preserved` : '')
    + `).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
