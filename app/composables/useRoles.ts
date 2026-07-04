export interface RoleEntry {
  id: number
  slug: string
  nameAr: string
  nameEn: string
  level: number
}

let inflight: Promise<RoleEntry[]> | null = null

export function useRoles() {
  const api = useApi()
  const roles = useState<RoleEntry[]>('roles-catalog', () => [])

  async function ensureLoaded(): Promise<RoleEntry[]> {
    if (roles.value.length > 0) return roles.value
    if (!inflight) {
      inflight = api<RoleEntry[]>('/roles')
        .then((rows) => {
          roles.value = rows
          return rows
        })
        .finally(() => { inflight = null })
    }
    return inflight
  }

  function bySlug(slug: string): RoleEntry | undefined {
    return roles.value.find(r => r.slug === slug)
  }

  function localizedName(slug: string): string {
    const locale = useI18n().locale.value
    const entry = bySlug(slug)
    if (!entry) return slug
    return locale === 'ar' ? entry.nameAr : entry.nameEn
  }

  return { roles, ensureLoaded, bySlug, localizedName }
}
