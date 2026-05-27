'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { clearStoredRole, isUserRole, syncRoleStorage } from '@/lib/auth-role'
import { useAuth } from '@/components/providers/auth-provider'

const authEntryRoutes = new Set(['/sign-in', '/sign-up'])
const roleSelectionRoute = '/select-role'
const publicRoutes = new Set(['/', ...authEntryRoutes])

function getRedirectTarget(pathname: string, role: ReturnType<typeof syncRoleStorage>) {
  const hasRole = isUserRole(role)

  if (authEntryRoutes.has(pathname)) {
    return hasRole ? '/dashboard' : roleSelectionRoute
  }

  if (pathname === roleSelectionRoute) {
    return hasRole ? '/dashboard' : null
  }

  if (!hasRole && !publicRoutes.has(pathname)) {
    return roleSelectionRoute
  }

  return null
}

export function AuthFlowGuard() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoaded } = useAuth()

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!user) {
      clearStoredRole()
      if (!publicRoutes.has(pathname)) {
        router.replace('/sign-in')
      }
      return
    }

    const role = syncRoleStorage(user)
    const target = getRedirectTarget(pathname, role)

    if (!target || target === pathname) {
      return
    }

    router.replace(target)
  }, [isLoaded, pathname, router, user])

  return null
}
