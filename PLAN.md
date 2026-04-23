# Halaqa Nuxt Rebuild Plan

Rebuild the React frontend (`front/`) as a Nuxt 3 + Nuxt UI v4 app inside `halaqa-nuxtjs/`.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Nuxt 3 |
| UI Library | @nuxt/ui v4 |
| Styling | Tailwind CSS (via Nuxt UI) |
| Icons | Lucide (via `i-lucide-*`) |
| Animations | Vue `<Transition>` + CSS |
| Drag & Drop | HTML5 native drag API (same as React) |
| Language | TypeScript |
| Package Manager | pnpm |

---

## Project Structure

```
halaqa-nuxtjs/
├── app.vue                        # Root: UApp > NuxtLayout > NuxtPage
├── nuxt.config.ts                 # Modules, CSS, RTL
├── app.config.ts                  # Nuxt UI theme (colors, radius)
├── assets/
│   └── css/
│       └── main.css               # @import tailwindcss + @import @nuxt/ui + fonts + RTL + custom tokens
├── types/
│   └── index.ts                   # LessonItem, DayData, Student interfaces
├── data/
│   └── constants.ts               # SURAHS list, STATUS_MAP, mock students
├── composables/
│   ├── useSchedule.ts             # Schedule state + moveLesson + copy/paste
│   ├── useStudents.ts             # Students state + CRUD
│   └── useAttendance.ts           # Attendance session state
├── layouts/
│   └── dashboard.vue              # Sidebar + Header shell
├── pages/
│   ├── index.vue                  # Dashboard (placeholder)
│   ├── planner.vue                # Lesson planner page
│   ├── attendance.vue             # Attendance page
│   ├── students.vue               # Students page
│   ├── analytics.vue              # Analytics (placeholder)
│   └── tasks.vue                  # Tasks (placeholder)
└── components/
    ├── app/
    │   ├── AppSidebar.vue         # Vertical nav (UNavigationMenu)
    │   └── AppHeader.vue          # Top bar with context actions
    ├── planner/
    │   ├── RangeInput.vue         # Surah/Ayah range editor (draggable)
    │   ├── DayColumn.vue          # Single category column (mem/near/far)
    │   ├── DayRow.vue             # Full day row (3 columns)
    │   └── PlannerActions.vue     # Edit toggle, copy/paste toolbar
    ├── attendance/
    │   ├── AttendanceStats.vue    # Stats cards (rate, completion, errors)
    │   └── AttendanceRow.vue      # Per-student attendance entry row
    └── student/
        ├── StudentCard.vue        # Student grid card
        ├── ViewStudentModal.vue   # Student profile UModal
        └── AddStudentModal.vue    # Add student UModal with UForm
```

---

## Phase 1 — Project Initialization

1. Scaffold Nuxt 3 project in `halaqa-nuxtjs/` with `pnpm dlx nuxi@latest init`
2. Install `@nuxt/ui` and configure `nuxt.config.ts`
3. Set up `assets/css/main.css` with font imports (Plus Jakarta Sans, Tajawal), RTL base, and design tokens
4. Configure `app.config.ts` with Nuxt UI theme (primary = lavender, secondary = mint)
5. Create `app.vue` with `UApp > NuxtLayout > NuxtPage`

---

## Phase 2 — Types, Data & Composables

6. Write `types/index.ts` — `LessonItem`, `DayData`, `Student`
7. Write `data/constants.ts` — `SURAHS`, `STATUS_MAP`, `MOCK_STUDENTS`, `STUDENTS_LIST`
8. Write `composables/useSchedule.ts` — reactive schedule state, `moveLesson`, `copyRows`, `pasteRows`, `deleteRows`
9. Write `composables/useStudents.ts` — reactive students state, modal open/close, `viewingStudent`
10. Write `composables/useAttendance.ts` — per-student status, mistakes, rating, notes

---

## Phase 3 — Layout

11. Write `layouts/dashboard.vue` — sidebar left (fixed 84px), main content right, header at top
12. Write `components/app/AppSidebar.vue` — logo + nav items using `UNavigationMenu` vertical, settings/help at bottom
13. Write `components/app/AppHeader.vue` — page title left, context-aware action buttons right (UButton)

---

## Phase 4 — Planner Page

14. Write `components/planner/RangeInput.vue` — draggable Surah/Ayah editor, `USelect` + `UInput`, delete on hover
15. Write `components/planner/DayColumn.vue` — drop zone, status badge (cycles on click), renders RangeInput list
16. Write `components/planner/DayRow.vue` — checkbox + day label + 3 DayColumns
17. Write `components/planner/PlannerActions.vue` — selection count, copy/delete/paste buttons (UButton)
18. Write `pages/planner.vue` — student selector, date header, PlannerActions, DayRow list, Add Day button

---

## Phase 5 — Attendance Page

19. Write `components/attendance/AttendanceStats.vue` — 3 stat UCards (rate, completion, errors)
20. Write `components/attendance/AttendanceRow.vue` — avatar, status toggle (UButton group), surah selector, mistakes ±, 5-star Tajwid, notes
21. Write `pages/attendance.vue` — header, AttendanceStats, student search UInput, AttendanceRow list, session notes

---

## Phase 6 — Students Page

22. Write `components/student/StudentCard.vue` — UCard with avatar, progress UProgress, attendance %, edit/message/view buttons
23. Write `components/student/ViewStudentModal.vue` — UModal with sidebar (profile, attendance bar) + scrollable content (progress, parent info, notes)
24. Write `components/student/AddStudentModal.vue` — UModal with UForm, UInput fields, file upload zone, daily metrics UInputNumber
25. Write `pages/students.vue` — header, add button, search + filter USelects, 3-col StudentCard grid, load-more

---

## Phase 7 — Placeholder Pages

26. Write `pages/index.vue` (Dashboard), `pages/analytics.vue`, `pages/tasks.vue` — centered placeholder with icon + label

---

## React → Nuxt UI Component Mapping

| React (custom) | Nuxt UI |
|---|---|
| Custom button | `UButton` |
| Custom text input | `UInput` |
| Surah dropdown | `USelect` |
| Student search | `UInput` with `i-lucide-search` icon |
| Filter dropdowns | `USelect` |
| Mistake counter | `UInputNumber` |
| Checkbox (row select) | `UCheckbox` |
| Modal (view/add student) | `UModal` |
| Sidebar nav | `UNavigationMenu` (vertical) |
| Custom card | `UCard` |
| Progress bar | `UProgress` |
| Textarea (notes) | `UTextarea` |
| Quick-tag buttons | `UButton` variant="soft" |
| Status badge | `UBadge` |
| Star rating | Custom (`UIcon` i-lucide-star, no built-in) |
| Framer Motion enter/exit | Vue `<Transition>` with CSS |
| Drag-and-drop | HTML5 native drag API |

---

## Design System → Nuxt UI Theme

```ts
// app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'purple',    // maps to #663564 / #804c7d lavender
      secondary: 'teal',    // maps to #356668 mint
      neutral: 'slate',
    }
  }
})
```

Custom tokens in `main.css` (same as React):
- `--color-primary`, `--color-secondary`, `--color-surface`, etc.
- All status colors: `#A7D2CB`, `#93C6E7`, `#FFD9C0`, `#EFB0C1`, `#86A3B8`
- RTL base: `html { direction: rtl; }`
- Font faces: Plus Jakarta Sans + Tajawal from Google Fonts

---

## RTL Strategy

- Set `dir="rtl"` globally on `<html>` in `nuxt.config.ts` via `app.head`
- Use `font-arabic` class (Tajawal) for Arabic text
- Tailwind RTL utilities (`ms-`, `me-`, `ps-`, `pe-`) for logical spacing
- Mirror sidebar to right side as in original (right sidebar, left content in modals)

---

## Key Behaviors to Preserve

| Behavior | Implementation |
|---|---|
| Drag lessons between columns | HTML5 drag API with `dragstart`/`dragover`/`drop` events |
| Status badge cycles on click | `STATUS_CYCLE` array, index stored in `DayData.statusColors` |
| Copy/paste planner rows | `useSchedule` clipboard array, new IDs on paste |
| Select all / deselect rows | `useSchedule` `selectedRowIds` Set |
| Edit mode toggle | `useSchedule` `isEditMode` ref, controls drag/edit/delete visibility |
| Add new day | Append to schedule with generated ID |
| View/Add student modals | `UModal` with `useStudents` open state |
| Attendance rating (5 stars) | Custom star component using `UIcon` + click handler |
| Session quick-tag buttons | Append text to notes textarea |
| AI note assist (Sparkles) | Placeholder UButton (Gemini integration future) |
