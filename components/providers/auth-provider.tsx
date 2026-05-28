'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { AuthUserResponse } from '@/types/type'
import { clearStoredRole, syncRoleStorage } from '@/lib/auth-role'

type AuthContextValue = {
  user: AuthUserResponse | null
  isLoaded: boolean
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserResponse | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin' })
      if (!response.ok) {
        setUser(null)
        clearStoredRole()
        return
      }

      const data = await response.json()
      const nextUser = data.user as AuthUserResponse
      setUser(nextUser)
      syncRoleStorage(nextUser)
    } catch {
      setUser(null)
      clearStoredRole()
    } finally {
      setIsLoaded(true)
    }
  }, [])

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    setUser(null)
    clearStoredRole()
  }, [])

  useEffect(() => {
    void (async () => {
      await refreshUser()
    })()
  }, [refreshUser])

  const value = useMemo(
    () => ({ user, isLoaded, refreshUser, signOut }),
    [user, isLoaded, refreshUser, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
