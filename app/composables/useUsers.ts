export type UserStatus = 'active' | 'inactive' | 'suspended'

export interface ManagedUser {
  id: number
  // The users module serves the four name parts in camelCase (unlike the
  // students module, which uses snake_case). `name` is derived server-side.
  firstName: string
  secondName: string
  thirdName: string
  familyName: string
  name: string
  // Null when the account was created without one — `id_number` is the
  // required identifier and also works as a login handle.
  email: string | null
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
  // Write payloads carry the parts in snake_case; sending `name` is a 400.
  first_name: string
  second_name: string
  third_name: string
  family_name: string
  // National ID — required by the backend on user creation, unique per school,
  // and usable as a login identifier. A bad checksum is stored with a warning.
  id_number: string
  email?: string | null
  password: string
  phone?: string | null
  photo_url?: string | null
  status?: UserStatus
  roles?: string[]
}

export interface UpdateUserPayload {
  first_name?: string
  second_name?: string
  third_name?: string
  family_name?: string
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
