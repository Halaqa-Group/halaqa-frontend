# Mushaf layout data

QUL splits the layout and the words into two resources. Download both (free login),
save them here with these exact names, then run the converter.

| File | QUL resource |
|---|---|
| `qpc-v1-layout-15.sqlite` | [Mushaf layout #15 — KFGQPC V1 (1405H)](https://qul.tarteel.ai/resources/mushaf-layout/15) → Download → sqlite |
| `qpc-v1-words.sqlite` | [QPC V1 Glyphs – Word by Word (#57)](https://qul.tarteel.ai/resources/quran-script/57) → Download → sqlite |

The layout's `pages` table holds each line's type/centering and a `first_word_id`
… `last_word_id` range; those ids reference the **words** resource (#57), which is
why both files are needed.

Then:

```bash
pnpm build:mushaf-layout
```

It reads both (Node's built-in `node:sqlite`), takes the authoritative line layout
from #15, maps the word ranges via #57, reuses our existing `code_v1` glyphs, and
rewrites `public/quran/pages/*.json` + `public/quran/meta/pages-all.json`.

Both `.sqlite` files are large binary exports — keep them out of git (ignored).
