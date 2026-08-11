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
/**
 * Whether `client_request_id` may go on the wire.
 *
 * OFF until the backend accepts it. The API validates with
 * `whitelist: true, forbidNonWhitelisted: true` (halaqa-backend `src/main.ts`),
 * so an unknown property is a **400 "property client_request_id should not
 * exist"** — not silently ignored. The id is still generated and stored with
 * local drafts, so flipping this in the same change that adds the field to
 * `CreateAchievementDto` server-side is all that's needed to switch it on.
 */
export const SEND_CLIENT_REQUEST_ID = false

/**
 * Drop `client_request_id` from a body about to be sent, while the API still
 * rejects it. Apply at the wire, never before storing a draft — the draft must
 * keep the id so its eventual upload carries the same one.
 */
export function forWire<T extends { client_request_id?: string }>(body: T): T {
  if (SEND_CLIENT_REQUEST_ID) return body
  const { client_request_id: _unsent, ...rest } = body
  return rest as T
}

export function newRequestId(): string {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  if (typeof c?.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`
}
