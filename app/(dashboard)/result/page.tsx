'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { ClientFormattedDate } from '@/components/client-formatted-date'
import { showErrorToast } from '@/lib/toast'
import type { Assignment } from '@/types/type'
import Link from 'next/link'

function totalMarks(assignment: Assignment) {
  return assignment.generated?.totalMarks ??
    assignment.questionTypes.reduce(
      (sum, item) => sum + item.numberOfQuestions * item.marksPerQuestion,
      0
    )
}

function totalQuestions(assignment: Assignment) {
  return (
    assignment.generated?.sections.reduce((sum, section) => sum + section.questions.length, 0) ??
    assignment.questionTypes.reduce((sum, item) => sum + item.numberOfQuestions, 0)
  )
}

function RadialScoreGauge({ score, total }: { score: number; total: number }) {
  const percentage = total > 0 ? (score / total) * 100 : 0
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  let strokeColor = 'stroke-red-500'
  let textColor = 'text-red-500'

  if (percentage >= 75) {
    strokeColor = 'stroke-emerald-500'
    textColor = 'text-emerald-500'
  } else if (percentage >= 40) {
    strokeColor = 'stroke-amber-500'
    textColor = 'text-amber-500'
  }

  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={radius} className="stroke-muted/40 fill-transparent" strokeWidth="5" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          className={`${strokeColor} fill-transparent transition-all duration-700 ease-out`}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-base font-extrabold leading-none ${textColor}`}>
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  )
}

function StudentResultsView() {
  type QuestionFeedback = {
    questionText?: string
    marksObtained: number
    maxMarks: number
    studentAnswerText?: string
    feedback?: string
  }

  type Submission = {
    _id: string
    score?: number
    totalMarks?: number
    questionsFeedback?: QuestionFeedback[]
    pdfUrl?: string
    createdAt?: string
    assignmentId?: { title?: string }
    status?: string
    feedback?: string
  }

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadSubmissions() {
      try {
        const response = await fetch('/api/submissions', {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error ?? 'Unable to load results')
        }

        if (isMounted) {
          setSubmissions(Array.isArray(data.submissions) ? data.submissions : [])
        }
      } catch {
        if (isMounted) {
          showErrorToast()
          setLoadFailed(true)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadSubmissions()
    return () => { isMounted = false }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="text-base text-muted-foreground animate-pulse">Fetching your graded submissions…</p>
      </div>
    )
  }

  if (loadFailed) {
    return (
      <p className="text-base text-muted-foreground">
        Unable to load results. Please refresh the page.
      </p>
    )
  }

  // Summary stats
  const totalSubmissions = submissions.length
  const totalScore = submissions.reduce((sum, s) => sum + (s.score || 0), 0)
  const totalPossible = submissions.reduce((sum, s) => sum + (s.totalMarks || 0), 0)
  const avgPercentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <p className="text-base text-muted-foreground">Your graded assessments</p>
        <h1 className="text-3xl font-semibold text-foreground">My Results</h1>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Submissions</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{totalSubmissions}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Marks Scored</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{totalScore.toFixed(1).replace('.0', '')}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Total Possible</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{totalPossible}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Avg. Grade</p>
          <p className={`mt-3 text-3xl font-semibold ${avgPercentage >= 75 ? 'text-emerald-500' : avgPercentage >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
            {avgPercentage}%
          </p>
        </div>
      </div>

      {/* Submissions list */}
      {submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-xl font-semibold text-foreground">No submissions yet</p>
          <p className="mt-2 text-base text-muted-foreground">
            Go to Attend Assessments, open an assessment, and upload your answer sheet PDF to get graded.
          </p>
          <Link
            href="/attend-assessments"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Browse Assessments →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {submissions.map((submission) => {
            const scoreVal = submission.score ?? 0
            const totalVal = submission.totalMarks ?? 0
            const percentage = totalVal > 0 ? (scoreVal / totalVal) * 100 : 0
            const isExpanded = expandedId === submission._id
            const assignmentTitle = submission.assignmentId?.title || 'Assessment'

            let gradeBadgeColor = 'bg-red-500/10 text-red-500 border-red-500/20'
            if (percentage >= 75) {
              gradeBadgeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            } else if (percentage >= 40) {
              gradeBadgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }

            return (
              <div key={submission._id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                {/* Main row */}
                <div className="flex flex-wrap items-center gap-4 p-5">
                  {/* Score gauge */}
                  <RadialScoreGauge score={scoreVal} total={totalVal} />

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xl font-semibold text-foreground truncate">{assignmentTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      Submitted on {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : '-'} at {submission.createdAt ? new Date(submission.createdAt).toLocaleTimeString() : '-'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className={`rounded-full border px-2.5 py-0.5 text-sm font-semibold ${gradeBadgeColor}`}>
                        {(scoreVal).toFixed(1).replace('.0', '')} / {totalVal} marks
                      </span>
                      <span className="rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-sm text-muted-foreground">
                        {submission.status === 'graded' ? '✓ Graded' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={submission.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-semibold text-foreground transition-all hover:bg-muted"
                      title="View submitted PDF"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      View PDF
                    </a>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : submission._id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition-all hover:bg-muted"
                    >
                      {isExpanded ? 'Hide Details' : 'Show Details'}
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
                        className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/5 px-5 py-5 space-y-5">
                    {/* General feedback */}
                    {submission.feedback && (
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">AI Feedback Summary</p>
                        <p className="text-sm text-foreground leading-relaxed italic">
                          &ldquo;{submission.feedback}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Submitted PDF download */}
                    {/* {submission.pdfUrl && (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">Submitted Answer Sheet</p>
                            <p className="text-xs text-muted-foreground">PDF Document</p>
                          </div>
                        </div>
                        <a
                          href={submission.pdfUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download PDF
                        </a>
                      </div>
                    )} */}

                    {/* Question-by-question breakdown */}
                    {submission.questionsFeedback && submission.questionsFeedback.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-foreground">Question-by-Question Breakdown</p>
                        <div className="grid gap-3">
                          {submission.questionsFeedback.map((qf: QuestionFeedback, idx: number) => {
                            const qPct = qf.maxMarks > 0 ? (qf.marksObtained / qf.maxMarks) * 100 : 0
                            let qBadge = 'bg-red-500/10 text-red-500 border-red-500/20'
                            if (qPct >= 75) qBadge = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            else if (qPct >= 40) qBadge = 'bg-amber-500/10 text-amber-500 border-amber-500/20'

                            return (
                              <div key={idx} className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="flex items-start gap-2 max-w-[80%]">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                      {idx + 1}
                                    </span>
                                    <p className="text-sm font-medium text-foreground">{qf.questionText}</p>
                                  </div>
                                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${qBadge}`}>
                                    {qf.marksObtained.toFixed(1).replace('.0', '')} / {qf.maxMarks}
                                  </span>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 bg-muted/15 rounded-lg p-3 border border-border/50">
                                  <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Your Answer</p>
                                    <p className="text-xs text-foreground italic leading-relaxed">
                                      &ldquo;{qf.studentAnswerText || 'Not attempted.'}&rdquo;
                                    </p>
                                  </div>
                                  <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-border/70 pt-2 sm:pt-0 sm:pl-3">
                                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">AI Review</p>
                                    <p className="text-xs text-foreground leading-relaxed">
                                      {qf.feedback || 'Correct.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


function TeacherResultsView() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadAssignments() {
      try {
        const response = await fetch('/api/assignments', {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error ?? 'Unable to load assessment results')
        }

        if (isMounted) {
          setAssignments(Array.isArray(data.assignments) ? data.assignments : [])
        }
      } catch {
        if (isMounted) {
          showErrorToast()
          setLoadFailed(true)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadAssignments()
    return () => { isMounted = false }
  }, [])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading recent results...</p>
  }

  if (loadFailed) {
    return (
      <p className="text-sm text-muted-foreground">
        Unable to load assessment results. Please refresh the page.
      </p>
    )
  }

  const publishedCount = assignments.length
  const questionCount = assignments.reduce((sum, assignment) => sum + totalQuestions(assignment), 0)
  const marksCount = assignments.reduce((sum, assignment) => sum + totalMarks(assignment), 0)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Published assessment overview</p>
        <h1 className="text-2xl font-semibold text-foreground">Results</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Published</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{publishedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Questions</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{questionCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Marks</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{marksCount}</p>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-lg font-semibold text-foreground">No published assessments yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Publish an assessment from Create Assessments to see it appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <div key={assignment._id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {assignment.title || `Assessment due ${new Date(assignment.dueDate).toLocaleDateString()}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Published <ClientFormattedDate value={assignment.createdAt} />
                  </p>
                </div>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {assignment.generated?.sections?.length ? 'AI READY' : 'PENDING'}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Questions</p>
                  <p className="mt-1 text-sm text-foreground">{totalQuestions(assignment)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total marks</p>
                  <p className="mt-1 text-sm text-foreground">{totalMarks(assignment)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Due date</p>
                  <p className="mt-1 text-sm text-foreground">
                    <ClientFormattedDate value={assignment.dueDate} />
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


export default function Page() {
  const { user } = useAuth()
  const role = user?.role

  if (role === 'student') {
    return <StudentResultsView />
  }

  return <TeacherResultsView />
}