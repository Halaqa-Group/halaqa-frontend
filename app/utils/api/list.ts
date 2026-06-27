/**
 * Some list endpoints in this backend return either a bare array or a
 * paginated `{ items, total, page, limit }` envelope depending on the resource.
 * Normalize both shapes here so callers don't have to branch.
 */
export function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === 'object' && 'items' in raw && Array.isArray((raw as { items: unknown[] }).items)) {
    return (raw as { items: T[] }).items
  }
  return []
}
