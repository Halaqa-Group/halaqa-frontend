import type { InjectionKey, Ref } from 'vue'

// Shared hovered-block state: MushafPage provides the ref, each MushafLine reads
// it so hovering any word of a drag-selected block lights the whole run — even
// when the block wraps across several lines. Holds the hovered block id, or null.
export const MUSHAF_HOVERED_GROUP: InjectionKey<Ref<string | null>> = Symbol('mushafHoveredGroup')
