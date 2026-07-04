export function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === 'object' && 'items' in raw && Array.isArray((raw as { items: unknown[] }).items)) {
    return (raw as { items: T[] }).items
  }
  return []
}
