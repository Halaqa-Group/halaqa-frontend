import { computed, onBeforeUnmount, toValue, watchEffect } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

interface Crumb { label?: string }

// A page-set title, keyed by the route it belongs to so a stale value from the
// previously-mounted page is never shown while the new one is settling in.
const override = ref<{ path: string, title: string } | null>(null)

/**
 * The current page's title for the app header. Prefers a dynamic override set by
 * the page (entity names, create/edit forms) and otherwise falls back to the
 * last crumb declared in the route's `breadcrumb` meta — so every default-layout
 * page gets a header title with no per-page wiring.
 */
export function usePageTitle() {
  const route = useRoute()
  const { t } = useI18n()

  const title = computed(() => {
    if (override.value && override.value.path === route.path) return override.value.title
    const crumbs = route.meta.breadcrumb as Crumb[] | undefined
    const label = crumbs?.[crumbs.length - 1]?.label
    return label ? t(label) : ''
  })

  return { title }
}

/**
 * Feed the header a runtime title (a student's name, "Edit achievement", …).
 * The value tracks reactively; it is scoped to the current route and dropped on
 * unmount, so navigating elsewhere falls back to the breadcrumb title.
 */
export function useSetPageTitle(source: MaybeRefOrGetter<string | null | undefined>) {
  const route = useRoute()
  watchEffect(() => {
    const value = toValue(source)
    override.value = value ? { path: route.path, title: value } : null
  })
  onBeforeUnmount(() => {
    if (override.value?.path === route.path) override.value = null
  })
}
