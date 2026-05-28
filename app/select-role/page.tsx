'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import { cn } from '@/lib/utils'
import { getPersistedRole, setStoredRole } from '@/lib/auth-role'
import type { UserRole } from '@/types/type'

const roles: {
  id: UserRole
  title: string
  description: string
  icon: typeof GraduationCap
  features: string[]
}[] = [
  {
    id: 'teacher',
    title: 'Teacher',
    description: 'Create AI-powered assessments, assign them to students, and review results.',
    icon: GraduationCap,
    features: [
      'Generate questions in seconds',
      'Customize difficulty and format',
      'Track class performance',
    ],
  },
  {
    id: 'student',
    title: 'Student',
    description: 'Take assessments, get instant feedback, and follow your learning progress.',
    icon: Users,
    features: [
      'Interactive assessments',
      'Instant scoring and feedback',
      'Personal progress insights',
    ],
  },
]

export default function SelectRolePage() {
  const router = useRouter()
  const { user, isLoaded, refreshUser } = useAuth()
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const existingRole = getPersistedRole(user)
  const isSaving = pendingRole !== null

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!user) {
      router.replace('/sign-in')
      return
    }

    if (existingRole) {
      router.replace('/dashboard')
    }
  }, [existingRole, isLoaded, router, user])

  const handleRoleSelect = async (role: UserRole) => {
    if (!user || isSaving) {
      return
    }

    setPendingRole(role)
    setErrorMessage('')

    try {
      const response = await fetch('/api/auth/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ role }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error ?? 'Unable to save role')
      }

      setStoredRole(role)
      await refreshUser()
      router.replace('/dashboard')
    } catch (error) {
      setPendingRole(null)
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save your role. Please try again.'
      )
    }
  }

  if (!isLoaded || !user || existingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Preparing your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', var(--font-sans), sans-serif" }}
    >
      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            One last step
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            How will you use VedaAI?
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Pick the experience that fits you. You can update this later from your profile settings.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {roles.map((role) => {
            const Icon = role.icon
            const isSelected = pendingRole === role.id
            const isOtherSaving = isSaving && pendingRole !== role.id

            return (
              <button
                key={role.id}
                type="button"
                disabled={isSaving}
                onClick={() => handleRoleSelect(role.id)}
                className={cn(
                  'group relative flex h-full flex-col rounded-2xl border bg-card p-6 text-left transition-all duration-200',
                  'hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected && 'border-foreground ring-2 ring-foreground/10',
                  isOtherSaving && 'opacity-60'
                )}
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <Icon className="h-6 w-6" />
                  </div>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving
                    </span>
                  ) : (
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors group-hover:border-foreground/30 group-hover:text-foreground">
                      Select
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-semibold">{role.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{role.description}</p>

                <ul className="mt-5 space-y-2">
                  {role.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground/70" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex items-center gap-2 text-sm font-medium">
                  {isSelected ? 'Continuing to dashboard' : `Continue as ${role.title}`}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            )
          })}
        </div>

        {errorMessage ? (
          <p className="mt-6 text-center text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Role-based dashboard
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
