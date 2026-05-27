'use client'

import { useRouter } from 'next/navigation'
import { AssignmentForm } from '@/components/Assignment-form'
import { getPersistedRole } from '@/lib/auth-role'
import { useAuth } from '@/components/providers/auth-provider'

export default function Page() {
  const router = useRouter()
  const { user, isLoaded } = useAuth()

  const role = getPersistedRole(user)

  if (!isLoaded) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading your access...
      </div>
    )
  }

  if (role !== 'teacher') {
    return (
      <div className="rounded-xl border border-destructive/40 bg-card p-8 shadow-sm">
        <p className="text-sm font-medium text-primary">Access restricted</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">You are not allowed to create assessments</h1>
        <p className="mt-3 text-muted-foreground">
          Only teacher accounts can create assessments. If you need access, sign out and register with the teacher role.
        </p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  return <AssignmentForm />
}
