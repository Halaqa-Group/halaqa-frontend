import { ref } from 'vue'
import { MOCK_STUDENTS } from '~/data/constants'
import type { Student } from '~/types'

const students = ref<Student[]>([...MOCK_STUDENTS])
const isAddModalOpen = ref(false)
const isViewModalOpen = ref(false)
const viewingStudent = ref<Student | null>(null)
const searchQuery = ref('')

export function useStudents() {
  function openView(student: Student) {
    viewingStudent.value = student
    isViewModalOpen.value = true
  }

  function closeView() {
    isViewModalOpen.value = false
    viewingStudent.value = null
  }

  function openAdd() {
    isAddModalOpen.value = true
  }

  function closeAdd() {
    isAddModalOpen.value = false
  }

  return {
    students,
    isAddModalOpen,
    isViewModalOpen,
    viewingStudent,
    searchQuery,
    openView,
    closeView,
    openAdd,
    closeAdd
  }
}
