export function useApiError() {
  function format(e: unknown, fallback: string): string {
    const data = (e as { data?: unknown } | null)?.data
    if (data && typeof data === 'object') {
      const raw = (data as { message?: unknown }).message
      if (Array.isArray(raw)) {
        const strings = raw.filter((x): x is string => typeof x === 'string' && x.length > 0)
        if (strings.length > 0) return strings.join('، ')
      }
      if (typeof raw === 'string' && raw.trim().length > 0) return raw
    }
    return fallback
  }
  return { format }
}
