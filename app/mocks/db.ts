import type {
  ApiAchievement,
  ApiAttendance,
  ApiHalaqa,
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
  role: 'teacher' | 'parent' | 'admin'
  school_id: number
  school_name: string
}

interface Sequences {
  student: number
  attendance: number
  achievement: number
  plan: number
  planItem: number
}

export interface MockDB {
  schools: { id: number, name: string }[]
  users: MockUser[]
  halaqat: ApiHalaqa[]
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
    school_id: 1,
    father_id: null,
    mother_id: null,
    name,
    email: null,
    dob: null,
    join_date: join,
    status: i === 2 || i === 5 ? 'inactive' : 'active',
    daily_hifz_pages_capacity: 1,
    daily_near_pages_capacity: 2,
    daily_far_pages_capacity: 5,
    notes: null,
    photo_url: null
  }))

  const halaqat: ApiHalaqa[] = [
    {
      id: 1,
      name: 'حلقة الفجر',
      type: 'Memorization',
      school_id: 1,
      teacher_id: 1,
      schedules: [0, 1, 2, 3, 4].map((d, i) => ({ id: 100 + i, day_of_week: d }))
    },
    {
      id: 2,
      name: 'حلقة العصر',
      type: 'Memorization',
      school_id: 1,
      teacher_id: 1,
      schedules: [1, 3, 5].map((d, i) => ({ id: 200 + i, day_of_week: d }))
    },
    {
      id: 3,
      name: 'حلقة المغرب',
      type: 'Tajweed',
      school_id: 1,
      teacher_id: 1,
      schedules: [2, 4].map((d, i) => ({ id: 300 + i, day_of_week: d }))
    }
  ]

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
    schools: [{ id: 1, name: 'مدرسة الحلقة' }],
    users: [
      {
        id: 1,
        name: 'الأستاذ يوسف',
        email: 'teacher@halaqa.app',
        role: 'teacher',
        school_id: 1,
        school_name: 'مدرسة الحلقة'
      }
    ],
    halaqat,
    students,
    enrollments,
    attendance,
    achievements,
    plans: [],
    seq: {
      student: students.length + 1,
      attendance: attSeq,
      achievement: achSeq,
      plan: 1,
      planItem: 1
    }
  }
}

export const db: MockDB = buildSeed()
