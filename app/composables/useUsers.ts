export type UserStatus = 'active' | 'inactive' | 'suspended'

export interface ManagedUser {
  id: number
  name: string
  email: string
  phone: string | null
  photoUrl: string | null
  status: UserStatus
  roles: string[]
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UserListResult {
  items: ManagedUser[]
  total: number
  page: number
  limit: number
}

export interface ListUsersQuery {
  page?: number
  limit?: number
  search?: string
  role?: string
  status?: UserStatus
}

export interface CreateUserPayload {
  name: string
  // National ID — required by the backend on user creation, unique per school,
  // and usable as a login identifier. A bad checksum is stored with a warning.
  id_number: string
  email: string
  password: string
  phone?: string | null
  photo_url?: string | null
  status?: UserStatus
  roles?: string[]
}

export interface UpdateUserPayload {
  name?: string
  phone?: string | null
  photo_url?: string | null
  status?: UserStatus
}

export interface AdminResetPasswordPayload {
  password: string
  password_confirmation: string
}

export function useUsers() {
  const api = useApi()

  function list(query: ListUsersQuery = {}) {
    return api<UserListResult>('/users', { query })
  }

  function get(id: number) {
    return api<ManagedUser>(`/users/${id}`)
  }

  function create(payload: CreateUserPayload) {
    return api<ManagedUser>('/users', { method: 'POST', body: payload })
  }

  function update(id: number, payload: UpdateUserPayload) {
    return api<ManagedUser>(`/users/${id}`, { method: 'PATCH', body: payload })
  }

  function softDelete(id: number) {
    return api(`/users/${id}`, { method: 'DELETE' })
  }

  function assignRole(id: number, roleId: number) {
    return api<ManagedUser>(`/users/${id}/roles`, {
      method: 'POST',
      body: { roleId }
    })
  }

  function removeRole(id: number, roleId: number) {
    return api<ManagedUser>(`/users/${id}/roles/${roleId}`, { method: 'DELETE' })
  }

  function adminResetPassword(id: number, payload: AdminResetPasswordPayload) {
    return api(`/users/${id}/reset-password`, {
      method: 'POST',
      body: payload
    })
  }

  return {
    list,
    get,
    create,
    update,
    softDelete,
    assignRole,
    removeRole,
    adminResetPassword
  }
}
