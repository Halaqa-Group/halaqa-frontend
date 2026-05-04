import { SURAH_NAMES } from '~/data/constants'
import type {
  ApiAchievement,
  ApiAttendance,
  ApiHalaqa,
  ApiParent,
  ApiStudent,
  ApiTeacher,
  ApiWeeklyPlan,
  ApiWeeklyPlanItem
} from '~/types'
import { db } from './db'
import { MockError, register } from './router'

function withSummary(s: ApiStudent): ApiStudent {
  const achievements = db.achievements.filter(a => a.student_id === s.id)
  const records = db.attendance.filter(a => a.student_id === s.id)
  const enrollment = db.enrollments.find(e => e.studentId === s.id)
  const halaqa = enrollment ? db.halaqat.find(h => h.id === enrollment.halaqaId) : undefined

  const latest = achievements[achievements.length - 1]
  const current_surah = latest ? SURAH_NAMES[latest.end_surah] : undefined

  const present = records.filter(a => a.status === 'Present').length
  const attendance_rate = records.length > 0
    ? Math.round((present / records.length) * 100)
    : undefined

  // Deterministic per-student progress so demos look varied without leaking
  // hash-based fakery into UI code.
  const progress_percent = ((s.id * 17 + 23) % 80) + 10

  return {
    ...s,
    progress_percent,
    current_surah,
    halaqa_name: halaqa?.name,
    attendance_rate
  }
}

// Auth endpoints are real (POST /auth/login, GET /auth/me, POST /auth/logout, …);
// the absence of mock handlers here makes them fall through to $fetch in useApi.

// ── Halaqat ─────────────────────────────────────────────────────────────────

function withTeacherName(h: ApiHalaqa): ApiHalaqa {
  const teacher = db.users.find(u => u.id === h.teacher_id)
  return {
    ...h,
    teacher_name: teacher?.name
  }
}

function nextHalaqaId(): number {
  return db.halaqat.length ? Math.max(...db.halaqat.map(h => h.id)) + 1 : 1
}

register('GET', '/halaqat', ({ query }) => {
  let list = db.halaqat
  if (query.teacherId) {
    const tid = Number(query.teacherId)
    list = list.filter(h => h.teacher_id === tid)
  }
  return list.map(withTeacherName)
})

function serializeTeacher(u: (typeof db.users)[number]): ApiTeacher {
  const assigned = db.halaqat.filter(h => h.teacher_id === u.id).map(h => h.name).join('، ')
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    identity_number: u.identity_number,
    phone: u.phone ?? null,
    status: u.status,
    assigned_halaqat: assigned || '—'
  }
}

function identityTaken(identity: string, excludeUserId?: number, excludeParentId?: number): boolean {
  const idNorm = identity.trim()
  for (const u of db.users) {
    if (u.identity_number !== idNorm) continue
    if (excludeUserId !== undefined && u.id === excludeUserId) continue
    return true
  }
  for (const p of db.parents) {
    if (p.identity_number !== idNorm) continue
    if (excludeParentId !== undefined && p.id === excludeParentId) continue
    return true
  }
  return false
}

register('GET', '/teachers', () => {
  return db.users
    .filter(u => u.role === 'teacher')
    .map(serializeTeacher)
})

register('POST', '/teachers', ({ body }) => {
  const b = (body ?? {}) as Partial<{
    name: string
    email: string
    identity_number: string
    phone: string | null
    status: 'active' | 'inactive'
  }>
  const name = (b.name ?? '').trim()
  const email = (b.email ?? '').trim().toLowerCase()
  const identity_number = (b.identity_number ?? '').trim()
  if (!name) throw new MockError(400, 'Name is required')
  if (!email) throw new MockError(400, 'Email is required')
  if (!identity_number) throw new MockError(400, 'Identity number is required')
  if (identityTaken(identity_number)) throw new MockError(400, 'Identity number already exists')
  if (db.users.some(u => u.email.toLowerCase() === email)) throw new MockError(400, 'Email already exists')
  const id = db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1
  const created: (typeof db.users)[number] = {
    id,
    name,
    email,
    role: 'teacher',
    school_id: 1,
    school_name: 'مدرسة الحلقة',
    identity_number,
    phone: b.phone?.trim() || null,
    status: b.status === 'inactive' ? 'inactive' : 'active'
  }
  db.users.push(created)
  return serializeTeacher(created)
})

register('PATCH', '/teachers/:id', ({ params, body }) => {
  const id = Number(params.id)
  const idx = db.users.findIndex(u => u.id === id && u.role === 'teacher')
  if (idx === -1) throw new MockError(404, 'Teacher not found')
  const cur = db.users[idx]!
  const b = (body ?? {}) as Partial<{
    name: string
    email: string
    identity_number: string
    phone: string | null
    status: 'active' | 'inactive'
  }>
  const identity_number = b.identity_number !== undefined ? String(b.identity_number).trim() : cur.identity_number
  if (!identity_number) throw new MockError(400, 'Identity number is required')
  if (identityTaken(identity_number, id, undefined)) throw new MockError(400, 'Identity number already exists')
  const email = b.email !== undefined ? String(b.email).trim().toLowerCase() : cur.email.toLowerCase()
  if (db.users.some(u => u.id !== id && u.email.toLowerCase() === email)) throw new MockError(400, 'Email already exists')
  const next: (typeof db.users)[number] = {
    ...cur,
    name: b.name !== undefined ? String(b.name).trim() || cur.name : cur.name,
    email: b.email !== undefined ? String(b.email).trim() : cur.email,
    identity_number,
    phone: b.phone !== undefined ? (b.phone ? String(b.phone).trim() : null) : (cur.phone ?? null),
    status: b.status ?? cur.status,
    id: cur.id,
    role: 'teacher',
    school_id: cur.school_id,
    school_name: cur.school_name
  }
  db.users[idx] = next
  return serializeTeacher(next)
})

register('DELETE', '/teachers/:id', ({ params }) => {
  const id = Number(params.id)
  const idx = db.users.findIndex(u => u.id === id && u.role === 'teacher')
  if (idx === -1) throw new MockError(404, 'Teacher not found')
  if (db.halaqat.some(h => h.teacher_id === id)) {
    throw new MockError(400, 'Cannot delete teacher assigned to a halaqa')
  }
  db.users.splice(idx, 1)
  return { success: true }
})

register('GET', '/parents', () => [...db.parents])

register('POST', '/parents', ({ body }) => {
  const b = (body ?? {}) as Partial<{
    name: string
    email: string
    identity_number: string
    phone: string | null
    children_count: number | string
    children_names: string
    status: 'active' | 'inactive'
  }>
  const name = (b.name ?? '').trim()
  const email = (b.email ?? '').trim().toLowerCase()
  const identity_number = (b.identity_number ?? '').trim()
  if (!name) throw new MockError(400, 'Name is required')
  if (!email) throw new MockError(400, 'Email is required')
  if (!identity_number) throw new MockError(400, 'Identity number is required')
  if (identityTaken(identity_number)) throw new MockError(400, 'Identity number already exists')
  if (db.parents.some(p => p.email.toLowerCase() === email)) throw new MockError(400, 'Email already exists')
  const children_count = Math.max(0, Number(b.children_count ?? 0) || 0)
  const children_names = (b.children_names ?? '').trim() || '—'
  const created: ApiParent = {
    id: db.seq.parent++,
    school_id: 1,
    name,
    email,
    phone: b.phone ? String(b.phone).trim() : null,
    identity_number,
    children_count,
    children_names,
    status: b.status === 'inactive' ? 'inactive' : 'active'
  }
  db.parents.push(created)
  return created
})

register('PATCH', '/parents/:id', ({ params, body }) => {
  const id = Number(params.id)
  const idx = db.parents.findIndex(p => p.id === id)
  if (idx === -1) throw new MockError(404, 'Parent not found')
  const cur = db.parents[idx]!
  const b = (body ?? {}) as Partial<{
    name: string
    email: string
    identity_number: string
    phone: string | null
    children_count: number | string
    children_names: string
    status: 'active' | 'inactive'
  }>
  const identity_number = b.identity_number !== undefined ? String(b.identity_number).trim() : cur.identity_number
  if (!identity_number) throw new MockError(400, 'Identity number is required')
  if (identityTaken(identity_number, undefined, id)) throw new MockError(400, 'Identity number already exists')
  const email = b.email !== undefined ? String(b.email).trim().toLowerCase() : cur.email.toLowerCase()
  if (db.parents.some(p => p.id !== id && p.email.toLowerCase() === email)) throw new MockError(400, 'Email already exists')
  const children_count = b.children_count !== undefined
    ? Math.max(0, Number(b.children_count) || 0)
    : cur.children_count
  const children_names = b.children_names !== undefined
    ? (String(b.children_names).trim() || '—')
    : cur.children_names
  const next: ApiParent = {
    ...cur,
    name: b.name !== undefined ? String(b.name).trim() || cur.name : cur.name,
    email: b.email !== undefined ? String(b.email).trim() : cur.email,
    identity_number,
    phone: b.phone !== undefined ? (b.phone ? String(b.phone).trim() : null) : cur.phone,
    children_count,
    children_names,
    status: b.status ?? cur.status,
    id: cur.id,
    school_id: cur.school_id
  }
  db.parents[idx] = next
  return next
})

register('DELETE', '/parents/:id', ({ params }) => {
  const id = Number(params.id)
  const idx = db.parents.findIndex(p => p.id === id)
  if (idx === -1) throw new MockError(404, 'Parent not found')
  db.parents.splice(idx, 1)
  return { success: true }
})

register('POST', '/halaqat', ({ body }) => {
  const b = (body ?? {}) as Partial<{
    name: string
    type: ApiHalaqa['type']
    teacher_id: number | string
    days: number[]
  }>
  const name = (b.name ?? '').trim()
  if (!name) throw new MockError(400, 'Name is required')
  if (b.teacher_id === undefined || b.teacher_id === null) throw new MockError(400, 'Teacher is required')
  const teacherId = Number(b.teacher_id)
  const teacher = db.users.find(u => u.id === teacherId && u.role === 'teacher')
  if (!teacher) throw new MockError(400, 'Invalid teacher')
  const days = (b.days && b.days.length > 0 ? [...b.days] : [0, 1, 2, 3, 4])
    .map(Number)
    .filter(d => d >= 0 && d <= 6)
  const uniqueDays = [...new Set(days)].sort((a, b) => a - b)
  if (!uniqueDays.length) throw new MockError(400, 'At least one weekday is required')
  let maxSch = 0
  for (const h of db.halaqat) {
    for (const s of h.schedules) maxSch = Math.max(maxSch, s.id)
  }
  const schedules = uniqueDays.map((day_of_week, i) => ({
    id: maxSch + i + 1,
    day_of_week
  }))
  const created: ApiHalaqa = {
    id: nextHalaqaId(),
    name,
    type: b.type && ['Memorization', 'Tajweed', 'Aqeedah'].includes(b.type) ? b.type : 'Memorization',
    school_id: 1,
    teacher_id: teacherId,
    schedules
  }
  db.halaqat.push(created)
  return withTeacherName(created)
})

register('PATCH', '/halaqat/:id', ({ params, body }) => {
  const id = Number(params.id)
  const idx = db.halaqat.findIndex(h => h.id === id)
  if (idx === -1) throw new MockError(404, 'Halaqa not found')
  const cur = db.halaqat[idx]!
  const b = (body ?? {}) as Partial<{
    name: string
    type: ApiHalaqa['type']
    teacher_id: number | string
    days: number[]
  }>
  if (b.teacher_id !== undefined && b.teacher_id !== null) {
    const teacherId = Number(b.teacher_id)
    const teacher = db.users.find(u => u.id === teacherId && u.role === 'teacher')
    if (!teacher) throw new MockError(400, 'Invalid teacher')
  }
  let schedules = cur.schedules
  if (b.days && b.days.length > 0) {
    const days = [...b.days].map(Number).filter(d => d >= 0 && d <= 6)
    const uniqueDays = [...new Set(days)].sort((a, b) => a - b)
    if (!uniqueDays.length) throw new MockError(400, 'At least one weekday is required')
    let maxSch = 0
    for (const h of db.halaqat) {
      for (const s of h.schedules) maxSch = Math.max(maxSch, s.id)
    }
    schedules = uniqueDays.map((day_of_week, i) => ({
      id: maxSch + i + 1,
      day_of_week
    }))
  }
  const next: ApiHalaqa = {
    ...cur,
    name: b.name !== undefined ? String(b.name).trim() || cur.name : cur.name,
    type: b.type && ['Memorization', 'Tajweed', 'Aqeedah'].includes(b.type) ? b.type : cur.type,
    teacher_id: b.teacher_id !== undefined && b.teacher_id !== null ? Number(b.teacher_id) : cur.teacher_id,
    schedules,
    id: cur.id,
    school_id: cur.school_id
  }
  db.halaqat[idx] = next
  return withTeacherName(next)
})

register('DELETE', '/halaqat/:id', ({ params }) => {
  const id = Number(params.id)
  const idx = db.halaqat.findIndex(h => h.id === id)
  if (idx === -1) throw new MockError(404, 'Halaqa not found')
  db.enrollments = db.enrollments.filter(e => e.halaqaId !== id)
  db.attendance = db.attendance.filter(a => a.halaqa_id !== id)
  db.achievements = db.achievements.filter(a => a.halaqa_id !== id)
  db.plans = db.plans.filter(p => p.halaqa_id !== id)
  db.halaqat.splice(idx, 1)
  return { success: true }
})

// ── Students ────────────────────────────────────────────────────────────────

register('GET', '/students', ({ query }) => {
  let list = db.students
  if (query.halaqaId) {
    const hid = Number(query.halaqaId)
    const enrolledIds = new Set(
      db.enrollments.filter(e => e.halaqaId === hid).map(e => e.studentId)
    )
    list = list.filter(s => enrolledIds.has(s.id))
  }
  return list.map(withSummary)
})

register('GET', '/students/:id', ({ params }) => {
  const id = Number(params.id)
  const student = db.students.find(s => s.id === id)
  if (!student) throw new MockError(404, 'Student not found')
  return withSummary(student)
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
  if (query.from) list = list.filter(a => a.date >= query.from!)
  if (query.to) list = list.filter(a => a.date <= query.to!)
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
