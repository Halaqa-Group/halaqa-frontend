import type {
  ApiAttendance,
  ApiParent,
  ApiSchool,
  ApiTeacher
} from '~/types'
import { db } from './db'
import { MockError, register } from './router'

// Auth endpoints are real (POST /auth/login, GET /auth/me, POST /auth/logout, …);
// the absence of mock handlers here makes them fall through to $fetch in useApi.

function currentSchool(): ApiSchool {
  const school = db.schools[0]
  if (!school) throw new MockError(404, 'School not found')
  return school
}

register('GET', '/school', () => {
  return currentSchool()
})

register('PATCH', '/school', ({ body }) => {
  const school = currentSchool()
  const b = (body ?? {}) as Partial<Pick<ApiSchool, 'name' | 'address' | 'phone' | 'status'>>
  if (b.name !== undefined) {
    const n = String(b.name).trim()
    if (!n) throw new MockError(400, 'Name is required')
    school.name = n
    for (const u of db.users) {
      if (u.school_id === school.id) u.school_name = n
    }
  }
  if (b.address !== undefined) school.address = String(b.address).trim()
  if (b.phone !== undefined) {
    const p = b.phone
    school.phone = p === null || p === '' ? null : String(p).trim()
  }
  if (b.status !== undefined) {
    if (b.status !== 'active' && b.status !== 'inactive') {
      throw new MockError(400, 'Invalid status')
    }
    school.status = b.status
  }
  return school
})

// All /halaqat* paths are owned by the real backend — no mock handlers here.

function serializeTeacher(u: (typeof db.users)[number]): ApiTeacher {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    identity_number: u.identity_number,
    phone: u.phone ?? null,
    status: u.status,
    assigned_halaqat: '—'
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

function emailTaken(email: string, excludeUserId?: number, excludeParentId?: number): boolean {
  const e = email.trim().toLowerCase()
  for (const u of db.users) {
    if (excludeUserId !== undefined && u.id === excludeUserId) continue
    if (u.email.toLowerCase() === e) return true
  }
  for (const p of db.parents) {
    if (excludeParentId !== undefined && p.id === excludeParentId) continue
    if (p.email.toLowerCase() === e) return true
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
  if (emailTaken(email)) throw new MockError(400, 'Email already exists')
  const id = db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1
  const created: (typeof db.users)[number] = {
    id,
    name,
    email,
    role: 'teacher',
    school_id: 1,
    school_name: currentSchool().name,
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
  // Halaqa assignment check is enforced server-side by the real backend.
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
  if (emailTaken(email)) throw new MockError(400, 'Email already exists')
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

// Halaqat write paths fall through to the real backend.

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

// ── Students ────────────────────────────────────────────────────────────────
// GET /students is owned by the real backend (paginated, snake_case halaqa_id).
// GET /students/:id is mocked here only because /recite uses it for a single
// name lookup and we need dev-without-backend to keep working.
register('GET', '/students/:id', ({ params }) => {
  const id = Number(params.id)
  const found = db.students.find(s => s.id === id)
  if (!found) throw new MockError(404, 'Student not found')
  return found
})

// ── Achievements & Weekly plans ──────────────────────────────────────────────
//
// These endpoints are served by the real NestJS backend (achievements module):
//   /achievements, /achievements/:id(/approve|/unapprove)
//   /weekly-plans, /weekly-plans/:id(/approve|/unapprove), /weekly-plans/:id/items
//   /weekly-plan-items/:id
// No mock handlers are registered for them, so they fall through to $fetch in
// useApi. (The earlier mock contract diverged from the backend — paginated
// envelopes, snake_case params, server-computed percentage_score and approval
// state machine — so it was removed during the backend integration.)
