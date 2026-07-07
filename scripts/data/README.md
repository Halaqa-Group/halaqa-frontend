# Mushaf layout data

These two `.sqlite` files **are committed** (~2.7 MB total) so the whole mushaf
can be rebuilt with `pnpm setup:quran` and **no qul.tarteel.ai login**. You only
need to touch this folder if you're refreshing the layout from a newer QUL export.

QUL splits the layout and the words into two resources. To refresh them, download
both (free login) and overwrite the files here with these exact names:

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

> Note: `build:mushaf-layout` runs *after* `build:quran` — it refines the base
> layout that step downloads. `pnpm setup:quran` chains them in the right order.
