import type {
  ApiAchievement,
  ApiAttendance,
  ApiStudent,
  ApiWeeklyPlan,
  ApiWeeklyPlanItem
} from '~/types'
import { db } from './db'
import { MockError, register } from './router'

function b64url(s: string): string {
  const utf8 = new TextEncoder().encode(s)
  let bin = ''
  for (const b of utf8) bin += String.fromCharCode(b)
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function makeFakeJWT(payload: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  return `${header}.${body}.mock-signature`
}

// ── Auth ────────────────────────────────────────────────────────────────────

register('POST', '/auth/login', ({ body }) => {
  const user = db.users[0]!
  const email = (body as { email?: string } | undefined)?.email ?? user.email
  const payload = {
    sub: user.id,
    id: user.id,
    name: user.name,
    email,
    role: user.role,
    school_id: user.school_id,
    school_name: user.school_name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  }
  return { access_token: makeFakeJWT(payload), user }
})

// ── Halaqat ─────────────────────────────────────────────────────────────────

register('GET', '/halaqat', ({ query }) => {
  let list = db.halaqat
  if (query.teacherId) {
    const tid = Number(query.teacherId)
    list = list.filter(h => h.teacher_id === tid)
  }
  return list
})

// ── Students ────────────────────────────────────────────────────────────────

register('GET', '/students', ({ query }) => {
  if (query.halaqaId) {
    const hid = Number(query.halaqaId)
    const enrolledIds = new Set(
      db.enrollments.filter(e => e.halaqaId === hid).map(e => e.studentId)
    )
    return db.students.filter(s => enrolledIds.has(s.id))
  }
  return db.students
})

register('GET', '/students/:id', ({ params }) => {
  const id = Number(params.id)
  const student = db.students.find(s => s.id === id)
  if (!student) throw new MockError(404, 'Student not found')
  return student
})

register('POST', '/students', ({ body }) => {
  const b = (body ?? {}) as Partial<ApiStudent> & { halaqa_id?: number | string }
  const id = db.seq.student++
  const created: ApiStudent = {
    id,
    school_id: b.school_id ?? 1,
    father_id: b.father_id ?? null,
    mother_id: b.mother_id ?? null,
    name: b.name ?? 'طالب جديد',
    email: b.email ?? null,
    dob: b.dob ?? null,
    join_date: b.join_date ?? new Date().toISOString().split('T')[0]!,
    status: b.status ?? 'active',
    daily_hifz_pages_capacity: b.daily_hifz_pages_capacity ?? 1,
    daily_near_pages_capacity: b.daily_near_pages_capacity ?? 2,
    daily_far_pages_capacity: b.daily_far_pages_capacity ?? 5,
    notes: b.notes ?? null,
    photo_url: b.photo_url ?? null
  }
  db.students.push(created)
  if (b.halaqa_id !== undefined && b.halaqa_id !== null) {
    db.enrollments.push({ studentId: id, halaqaId: Number(b.halaqa_id) })
  }
  return created
})

register('PATCH', '/students/:id', ({ params, body }) => {
  const id = Number(params.id)
  const idx = db.students.findIndex(s => s.id === id)
  if (idx === -1) throw new MockError(404, 'Student not found')
  db.students[idx] = { ...db.students[idx]!, ...(body as Partial<ApiStudent>), id }
  return db.students[idx]
})

// ── Attendance ──────────────────────────────────────────────────────────────

register('GET', '/attendance', ({ query }) => {
  let list = db.attendance
  if (query.halaqaId) list = list.filter(a => a.halaqa_id === Number(query.halaqaId))
  if (query.date) list = list.filter(a => a.date === query.date)
  if (query.studentId) list = list.filter(a => a.student_id === Number(query.studentId))
  return list
})

register('POST', '/attendance', ({ body }) => {
  const b = body as {
    student_id: number | string
    halaqa_id: number | string
    date: string
    status: ApiAttendance['status']
    notes?: string | null
  }
  const created: ApiAttendance = {
    id: db.seq.attendance++,
    student_id: Number(b.student_id),
    halaqa_id: Number(b.halaqa_id),
    date: b.date,
    status: b.status,
    notes: b.notes ?? null
  }
  db.attendance.push(created)
  return created
})

register('PATCH', '/attendance/:id', ({ params, body }) => {
  const id = Number(params.id)
  const idx = db.attendance.findIndex(a => a.id === id)
  if (idx === -1) throw new MockError(404, 'Attendance not found')
  db.attendance[idx] = { ...db.attendance[idx]!, ...(body as Partial<ApiAttendance>), id }
  return db.attendance[idx]
})

// ── Achievements ────────────────────────────────────────────────────────────

register('GET', '/achievements', ({ query }) => {
  let list = db.achievements
  if (query.halaqaId) list = list.filter(a => a.halaqa_id === Number(query.halaqaId))
  if (query.studentId) list = list.filter(a => a.student_id === Number(query.studentId))
  if (query.date) list = list.filter(a => a.date === query.date)
  return list
})

register('POST', '/achievements', ({ body }) => {
  const b = body as {
    student_id: number
    halaqa_id: number
    date: string
    track_type: ApiAchievement['track_type']
    start_surah: number
    start_verse: number
    end_surah: number
    end_verse: number
    mistakes_count?: number
    warnings_count?: number
    tajweed_errors_count?: number
    teacher_notes?: string | null
  }
  const created: ApiAchievement = {
    id: db.seq.achievement++,
    student_id: Number(b.student_id),
    halaqa_id: Number(b.halaqa_id),
    date: b.date,
    track_type: b.track_type,
    start_surah: b.start_surah,
    start_verse: b.start_verse,
    end_surah: b.end_surah,
    end_verse: b.end_verse,
    mistakes_count: b.mistakes_count ?? 0,
    warnings_count: b.warnings_count ?? 0,
    tajweed_errors_count: b.tajweed_errors_count ?? 0,
    percentage_score: 100,
    status: 'approved',
    teacher_notes: b.teacher_notes ?? null,
    is_unplanned: false,
    is_flagged_conflict: false
  }
  db.achievements.push(created)
  return created
})

register('PATCH', '/achievements/:id', ({ params, body }) => {
  const id = Number(params.id)
  const idx = db.achievements.findIndex(a => a.id === id)
  if (idx === -1) throw new MockError(404, 'Achievement not found')
  db.achievements[idx] = { ...db.achievements[idx]!, ...(body as Partial<ApiAchievement>), id }
  return db.achievements[idx]
})

register('DELETE', '/achievements/:id', ({ params }) => {
  const id = Number(params.id)
  const before = db.achievements.length
  db.achievements = db.achievements.filter(a => a.id !== id)
  if (db.achievements.length === before) throw new MockError(404, 'Achievement not found')
  return { success: true }
})

// ── Weekly plans ────────────────────────────────────────────────────────────

register('GET', '/plans', ({ query }) => {
  let list = db.plans
  if (query.studentId) list = list.filter(p => p.student_id === Number(query.studentId))
  if (query.halaqaId) list = list.filter(p => p.halaqa_id === Number(query.halaqaId))
  if (query.weekStartDate) list = list.filter(p => p.week_start_date === query.weekStartDate)
  return list
})

register('POST', '/plans', ({ body }) => {
  const b = body as { student_id: number, halaqa_id: number, week_start_date: string }
  const created: ApiWeeklyPlan = {
    id: db.seq.plan++,
    student_id: Number(b.student_id),
    halaqa_id: Number(b.halaqa_id),
    week_start_date: b.week_start_date,
    status: 'draft',
    items: []
  }
  db.plans.push(created)
  return created
})

register('POST', '/plans/:planId/items', ({ params, body }) => {
  const planId = Number(params.planId)
  const plan = db.plans.find(p => p.id === planId)
  if (!plan) throw new MockError(404, 'Plan not found')
  const b = body as Omit<ApiWeeklyPlanItem, 'id' | 'weekly_plan_id' | 'total_verses' | 'achieved_verses' | 'status' | 'is_manual_override'>
  const item: ApiWeeklyPlanItem = {
    id: db.seq.planItem++,
    weekly_plan_id: planId,
    day_of_week: b.day_of_week,
    track_type: b.track_type,
    start_surah: b.start_surah,
    start_verse: b.start_verse,
    end_surah: b.end_surah,
    end_verse: b.end_verse,
    total_verses: 0,
    achieved_verses: 0,
    status: 'due',
    is_manual_override: false
  }
  plan.items.push(item)
  return item
})

register('DELETE', '/plans/:planId/items/:itemId', ({ params }) => {
  const planId = Number(params.planId)
  const itemId = Number(params.itemId)
  const plan = db.plans.find(p => p.id === planId)
  if (!plan) throw new MockError(404, 'Plan not found')
  plan.items = plan.items.filter(i => i.id !== itemId)
  return { success: true }
})

register('POST', '/plans/:planId/submit', ({ params }) => {
  const planId = Number(params.planId)
  const plan = db.plans.find(p => p.id === planId)
  if (!plan) throw new MockError(404, 'Plan not found')
  plan.status = 'approved'
  return plan
})
