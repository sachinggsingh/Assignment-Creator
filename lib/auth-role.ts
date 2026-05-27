import type { AuthUserResponse, UserRole } from '@/types/type'

export type { UserRole }

export function isUserRole(value: unknown): value is UserRole {
  return value === 'teacher' || value === 'student'
}

export function getStoredRole(): UserRole | null {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = sessionStorage.getItem('userRole')
  return isUserRole(stored) ? stored : null
}

export function setStoredRole(role: UserRole) {
  sessionStorage.setItem('userRole', role)
}

export function clearStoredRole() {
  if (typeof window === 'undefined') {
    return
  }

  sessionStorage.removeItem('userRole')
}

export function getPersistedRole(user: AuthUserResponse | null | undefined): UserRole | null {
  return isUserRole(user?.role) ? user.role : null
}

export function syncRoleStorage(user: AuthUserResponse | null | undefined): UserRole | null {
  const persisted = getPersistedRole(user)

  if (!persisted) {
    clearStoredRole()
    return null
  }

  setStoredRole(persisted)
  return persisted
}

export function getUserRole(user: AuthUserResponse | null | undefined): UserRole | null {
  return getPersistedRole(user) ?? getStoredRole()
}
