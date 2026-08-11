/**
 * Opaque id for one write *intent*, used as an idempotency key so a retry of the
 * same save can be recognised as the same save rather than a new one.
 *
 * Generate it once where the intent is formed (a form mount, a recitation
 * session) and keep it for every attempt at that write — regenerating per
 * attempt would defeat the whole point.
 *
 * `crypto.randomUUID` is unavailable on insecure origins (a phone hitting the
 * dev server over plain http), hence the fallback.
 */
export function newRequestId(): string {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  if (typeof c?.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`
}
