// Local-calendar date helpers. The API speaks plain `YYYY-MM-DD` (no timezone),
// so every conversion goes through the browser's local calendar — never
// `toISOString()`, which shifts the day for anyone east/west of UTC.

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayYmd(): string {
  return toYmd(new Date())
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}
