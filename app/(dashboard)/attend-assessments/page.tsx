'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClientFormattedDate } from '@/components/client-formatted-date'
import type { Assignment } from '@/types/type'

function totalQuestionCount(assignment: Assignment) {
  if (assignment.generated?.sections?.length) {
    return assignment.generated.sections.reduce(
      (sum, section) => sum + section.questions.length,
      0
    )
  }

  return assignment.questionTypes.reduce((sum, item) => sum + item.numberOfQuestions, 0)
}

function computeTotalMarks(assignment: Assignment) {
  if (assignment.generated?.sections?.length) {
    return assignment.generated.sections.reduce((sum, section) => {
      const sectionMarks = section.totalMarks || section.questions.reduce((s, q) => s + (Number(q.marks) || 1), 0)
      return sum + sectionMarks
    }, 0)
  }
  return assignment.questionTypes.reduce((sum, item) => sum + item.numberOfQuestions * item.marksPerQuestion, 0)
}

export default function Page() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadAssignments() {
      try {
        const response = await fetch('/api/assignments', {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error ?? 'Failed to load assignments')
        }

        if (isMounted) {
          setAssignments(Array.isArray(data.assignments) ? data.assignments : [])
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to load assignments')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAssignments()

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading assignments...</p>
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
        <p className="text-sm font-medium text-red-500">{error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Check that MongoDB is connected and refresh the page.
        </p>
      </div>
    )
  }

  if (assignments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-lg font-semibold text-foreground">No assignments available yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a new assessment from the Create Assessments page to see it appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Available assignments</p>
        <h1 className="text-2xl font-semibold text-foreground">Attend Assessments</h1>
      </div>

      <div className="grid gap-4">
        {assignments.map((assignment) => {
          const questionCount = totalQuestionCount(assignment)
          const isReady = Boolean(assignment.generated?.sections?.length)

          return (
            <div key={assignment._id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {assignment.title || `Assessment due ${new Date(assignment.dueDate).toLocaleDateString()}`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ID: {assignment._id}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Due <ClientFormattedDate value={assignment.dueDate} />
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {isReady ? 'READY' : 'PENDING'}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Questions</p>
                  <p className="mt-1 text-sm text-foreground">{questionCount}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total marks</p>
                  <p className="mt-1 text-sm text-foreground">
                    {computeTotalMarks(assignment)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Created</p>
                  <p className="mt-1 text-sm text-foreground">
                    <ClientFormattedDate value={assignment.createdAt} />
                  </p>
                </div>
              </div>



              {isReady ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/attend-assessments/${assignment._id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    View Assessment
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <p className="mt-4 text-sm text-amber-600">
                  Questions are still being prepared for this assignment.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
