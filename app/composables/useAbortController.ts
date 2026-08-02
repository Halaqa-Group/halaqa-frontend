/**
 * Per-key AbortController registry for blocking duplicate/overlapping work.
 *
 * Starting a new operation under a key aborts any predecessor still in flight,
 * so a rapid re-trigger — a double-clicked save, a burst of reactive watchers, a
 * fast filter/date change — can never leave two requests racing to write the same
 * state (the classic out-of-order, last-response-wins bug). Controllers tear down
 * automatically when the owning component/scope disposes.
 *
 * Prefer `run()` for the common case; it wires the signal, swallows the abort of a
 * superseded run, and cleans up in one call. Reach for `begin()`/`end()` only when
 * you need the raw signal (e.g. to hand to a non-`useApi` call).
 */
export function useAbortController() {
  const controllers = new Map<string, AbortController>()

  /** Begin an operation for `key`, aborting any in-flight predecessor. Returns its signal. */
  function begin(key = 'default'): AbortSignal {
    controllers.get(key)?.abort()
    const controller = new AbortController()
    controllers.set(key, controller)
    return controller.signal
  }

  /**
   * Drop the controller for `key` once its operation settles. Pass the operation's
   * own `signal` so a run that was already superseded by a newer `begin()` doesn't
   * clear its successor's controller.
   */
  function end(key = 'default', signal?: AbortSignal) {
    const current = controllers.get(key)
    if (!current) return
    if (signal && current.signal !== signal) return
    controllers.delete(key)
  }

  /**
   * Run `fn` under a fresh signal for `key`, aborting any prior run first. If the
   * run is superseded (aborted), the abort is swallowed and the promise resolves to
   * `undefined` — so callers never need their own try/catch just for cancellation.
   * Real errors still propagate.
   */
  async function run<T>(key: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    const signal = begin(key)
    try {
      return await fn(signal)
    } catch (e) {
      if (signal.aborted || isAbortError(e)) return undefined
      throw e
    } finally {
      end(key, signal)
    }
  }

  /** Abort (and forget) the in-flight operation for `key`, if any. */
  function abort(key = 'default') {
    controllers.get(key)?.abort()
    controllers.delete(key)
  }

  /** Abort every tracked operation — called automatically on scope dispose. */
  function abortAll() {
    for (const controller of controllers.values()) controller.abort()
    controllers.clear()
  }

  /** Whether an operation for `key` is currently in flight (started, not yet settled/aborted). */
  function isPending(key = 'default'): boolean {
    const controller = controllers.get(key)
    return !!controller && !controller.signal.aborted
  }

  if (getCurrentScope()) onScopeDispose(abortAll)

  return { begin, end, run, abort, abortAll, isPending }
}

/**
 * True when `e` is the error raised by an aborted fetch/AbortController — whether a
 * raw DOMException or an ofetch wrapper carrying `name: 'AbortError'`. Use it to
 * distinguish a deliberately-cancelled request (drop it silently) from a real
 * failure (surface it).
 */
export function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException) return e.name === 'AbortError'
  if (!e || typeof e !== 'object') return false
  const err = e as { name?: string, cause?: unknown }
  if (err.name === 'AbortError') return true
  // ofetch wraps the underlying abort under `cause`.
  return err.cause instanceof DOMException && err.cause.name === 'AbortError'
}
