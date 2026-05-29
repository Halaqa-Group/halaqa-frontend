# Mushaf assets

Static data the in-app mushaf renderer needs. Regenerate with:

```bash
pnpm build:quran          # idempotent; pass --force to re-fetch
```

The build script lives at [`scripts/build-quran-assets.mjs`](../../scripts/build-quran-assets.mjs).

## What's here

| Path | What | Source |
|---|---|---|
| `pages/{1..604}.json` | One file per mushaf page. Compact shape (see below). | [api.quran.com v4](https://api.quran.com/api/v4) `/verses/by_page/{N}` |
| `meta/verse-to-page.json` | `{ "2:255": 42, … }` — every verse_key → its mushaf page. 6,236 entries. | Derived from the page files. |
| `fonts/v1/p{1..604}.woff2` | KFGQPC v1 (1405 H print) glyph fonts, one per mushaf page. ~40 MB total. | Mirrored from `static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1-optimized/`. |

Fonts are self-hosted (not CDN-referenced) so navigating to a fresh page
doesn't pay the per-page DNS + TLS round-trip — first paint drops from
~2s against the CDN to <100ms locally.

## Page file shape

```jsonc
{
  "page": 1,
  "surahs": [1],                    // surah numbers appearing on this page
  "verses": ["1:1", "1:2", ...],    // verse_keys on this page (in order)
  "lines": [
    {
      "n": 2,                       // line number (1..15); see note below
      "words": [
        { "c": "ﭑ", "k": "1:1", "p": 1 },        // c = code_v1 glyph
        { "c": "ﭕ", "k": "1:1", "p": 5, "t": "e" }// k = verse_key, p = position-in-verse
      ]                                            // t = type ('e'=end marker, 'p'=pause, ...)
                                                   //     absent for normal words
    }
  ]
}
```

Words within a line are already in mushaf reading order — do not re-sort them.

### Why some line numbers are missing

Lines that hold a **surah-name header** or **basmala** show up as gaps
(e.g. page 2 has lines 3..8 but not 1..2 — those are Al-Baqarah's header lines).
The Quran.com API returns words only; decorative headers are reconstructed at
render time by detecting the gap and consulting the `surahs` list.

## Rendering recipe

For each line's words: render `<span class="p{page}-v1">{word.c}</span>` with
the page-specific `@font-face` loaded by `useMushafPage()`. See
[Tutorial 2 in the QUL docs](../../../quranic-universal-library-main/docs/tutorial-mushaf-layout-end-to-end.md)
for the broader picture.

## Attribution

- Word data: [Quran.com / Quran Foundation](https://api-docs.quran.com/) (CC BY-NC 4.0 for derived data; original mushaf is KFGQPC).
- Fonts: KFGQPC Hafs Madani Mushaf v1 (1405 H print), distributed via Tarteel's CDN under `v1-optimized/`.
