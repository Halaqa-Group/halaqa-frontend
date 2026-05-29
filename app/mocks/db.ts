import type {
  ApiAchievement,
  ApiAttendance,
  ApiParent,
  ApiSchool,
  ApiStudent,
  ApiWeeklyPlan
} from '~/types'

interface Enrollment {
  studentId: number
  halaqaId: number
}

interface MockUser {
  id: number
  name: string
  email: string
  role: 'teacher' | 'parent' | 'admin' | 'principal'
  school_id: number
  school_name: string
  identity_number: string
  phone?: string | null
  status: 'active' | 'inactive'
}

interface Sequences {
  student: number
  parent: number
  attendance: number
  achievement: number
  plan: number
  planItem: number
}

export interface MockDB {
  schools: ApiSchool[]
  users: MockUser[]
  parents: ApiParent[]
  students: ApiStudent[]
  enrollments: Enrollment[]
  attendance: ApiAttendance[]
  achievements: ApiAchievement[]
  plans: ApiWeeklyPlan[]
  seq: Sequences
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildSeed(): MockDB {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const joinedAt = new Date(today)
  joinedAt.setMonth(joinedAt.getMonth() - 6)
  const join = isoDate(joinedAt)

  const studentNames = [
    'أميرة رحمن',
    'زيد الفارسي',
    'ليلى حسن',
    'عمر خالد',
    'فاطمة الزهراء',
    'حمزة علي',
    'يوسف ناصر',
    'سارة محمد'
  ]

  const students: ApiStudent[] = studentNames.map((name, i) => ({
    id: i + 1,
    name,
    gender: i % 2 === 0 ? 'female' : 'male',
    id_number: null,
    dob: null,
    join_date: join,
    status: i === 2 || i === 5 ? 'inactive' : 'active',
    daily_hifz_pages_capacity: 1,
    daily_near_pages_capacity: 2,
    daily_far_pages_capacity: 5,
    notes: null,
    photo_url: null
  }))

  // Halaqat are owned by the real backend — see /halaqat endpoints.

  const enrollments: Enrollment[] = []
  for (let id = 1; id <= 4; id++) enrollments.push({ studentId: id, halaqaId: 1 })
  for (let id = 5; id <= 7; id++) enrollments.push({ studentId: id, halaqaId: 2 })
  enrollments.push({ studentId: 8, halaqaId: 3 })
  enrollments.push({ studentId: 1, halaqaId: 3 })

  const statuses: ApiAttendance['status'][] = ['Present', 'Present', 'Present', 'Late', 'Absent']
  const attendance: ApiAttendance[] = []
  let attSeq = 1
  for (let d = 7; d >= 1; d--) {
    const date = new Date(today)
    date.setDate(date.getDate() - d)
    const dateStr = isoDate(date)
    for (const en of enrollments) {
      const seed = (en.studentId * 31 + en.halaqaId * 7 + d) % statuses.length
      attendance.push({
        id: attSeq++,
        student_id: en.studentId,
        halaqa_id: en.halaqaId,
        date: dateStr,
        status: statuses[seed]!,
        notes: null
      })
    }
  }

  const tracks: ApiAchievement['track_type'][] = ['Hifz', 'Near', 'Far']
  const achievements: ApiAchievement[] = []
  let achSeq = 1
  for (let d = 3; d >= 1; d--) {
    const date = new Date(today)
    date.setDate(date.getDate() - d)
    const dateStr = isoDate(date)
    for (const en of enrollments.slice(0, 5)) {
      const t = tracks[(en.studentId + d) % 3]!
      achievements.push({
        id: achSeq++,
        student_id: en.studentId,
        halaqa_id: en.halaqaId,
        date: dateStr,
        track_type: t,
        start_surah: 78,
        start_verse: 1,
        end_surah: 78,
        end_verse: 10 + ((en.studentId + d) % 20),
        mistakes_count: (en.studentId + d) % 3,
        warnings_count: 0,
        tajweed_errors_count: (en.studentId + d) % 2,
        percentage_score: 80 + ((en.studentId * 5 + d) % 20),
        status: 'approved',
        teacher_notes: null,
        is_unplanned: false,
        is_flagged_conflict: false
      })
    }
  }

  return {
    schools: [{
      id: 1,
      name: 'مدرسة الحلقة',
      address: 'طريق الملك فهد، حي النرجس، الرياض',
      phone: '+966112345678',
      status: 'active'
    }],
    users: [
      {
        id: 1,
        name: 'الأستاذ يوسف',
        email: 'teacher@halaqa.app',
        role: 'teacher',
        school_id: 1,
        school_name: 'مدرسة الحلقة',
        identity_number: '1000000001',
        phone: '+966501000001',
        status: 'active'
      },
      {
        id: 2,
        name: 'الأستاذ خالد',
        email: 'khaled@halaqa.app',
        role: 'teacher',
        school_id: 1,
        school_name: 'مدرسة الحلقة',
        identity_number: '1000000002',
        phone: '+966501000002',
        status: 'active'
      },
      {
        id: 50,
        name: 'مدير المدرسة',
        email: 'principal@halaqa.app',
        role: 'principal',
        school_id: 1,
        school_name: 'مدرسة الحلقة',
        identity_number: '1000000050',
        phone: '+966501000050',
        status: 'active'
      }
    ],
    parents: [
      {
        id: 1,
        school_id: 1,
        name: 'إبراهيم السعيد',
        email: 'i.saeed@example.com',
        phone: '+966501111222',
        identity_number: '2000000001',
        children_count: 2,
        children_names: 'عبدالله إبراهيم، يوسف إبراهيم',
        status: 'active'
      },
      {
        id: 2,
        school_id: 1,
        name: 'فاطمة أحمد',
        email: 'f.ahmad@example.com',
        phone: null,
        identity_number: '2000000002',
        children_count: 1,
        children_names: 'مريم أحمد',
        status: 'active'
      },
      {
        id: 3,
        school_id: 1,
        name: 'سعد الخالدي',
        email: 's.khaledi@example.com',
        phone: '+966509998877',
        identity_number: '2000000003',
        children_count: 0,
        children_names: '—',
        status: 'inactive'
      }
    ],
    students,
    enrollments,
    attendance,
    achievements,
    plans: buildSeedPlans(),
    seq: {
      student: students.length + 1,
      parent: 4,
      attendance: attSeq,
      achievement: achSeq,
      plan: 5,
      planItem: 50
    }
  }
}

// Seeds an approved weekly plan for student 1 in halaqa 1 covering the
// current week. day_of_week uses Sat=0..Fri=6 to match halaqa_schedules.
// We add a Hifz item AND a Near item for today so the /recite page can
// demonstrate the "pick a track" chips.
function buildSeedPlans(): ApiWeeklyPlan[] {
  const today = new Date()
  const dow = (today.getDay() + 1) % 7 // Sat=0..Fri=6
  const sat = new Date(today)
  sat.setDate(today.getDate() - dow)
  const weekStart =
    `${sat.getFullYear()}-${String(sat.getMonth() + 1).padStart(2, '0')}-${String(sat.getDate()).padStart(2, '0')}`

  return [
    {
      id: 1,
      student_id: 1,
      halaqa_id: 1,
      week_start_date: weekStart,
      status: 'approved',
      items: [
        {
          id: 1, weekly_plan_id: 1,
          day_of_week: dow, track_type: 'Hifz',
          start_surah: 1, start_verse: 1, end_surah: 1, end_verse: 7,
          total_verses: 7, achieved_verses: 0,
          status: 'due', is_manual_override: false
        },
        {
          id: 2, weekly_plan_id: 1,
          day_of_week: dow, track_type: 'Near',
          start_surah: 78, start_verse: 1, end_surah: 78, end_verse: 20,
          total_verses: 20, achieved_verses: 0,
          status: 'due', is_manual_override: false
        }
      ]
    }
  ]
}

export const db: MockDB = buildSeed()
