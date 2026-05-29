'use client'

import {
  use,
  useEffect,
  useState,
} from 'react'

import { useRouter } from 'next/navigation'

import { ClientFormattedDate } from '@/components/client-formatted-date'
import { useAuth } from '@/components/providers/auth-provider'
import { getUserRole } from '@/lib/auth-role'
import { showErrorToast } from '@/lib/toast'

import type {
  Assignment,
  GeneratedSection,
} from '@/types/type'



type DifficultyLevel =
  | 'easy'
  | 'medium'
  | 'hard'

type DifficultyStats = Record<
  DifficultyLevel,
  number
>

type TypeStats = Record<
  string,
  number
>

type SubmissionQuestionFeedback =
  {
    questionText: string
    marksObtained: number
    maxMarks: number
    studentAnswerText?: string
    feedback?: string
  }

type Submission = {
  _id: string
  pdfUrl: string
  score: number
  totalMarks: number
  feedback?: string
  createdAt: string
  questionsFeedback?: SubmissionQuestionFeedback[]
}

type AssignmentResponse = {
  assignment: Assignment
  error?: string
}

type SubmissionResponse = {
  submissions?: Submission[]
  submission?: Submission
  error?: string
}



function difficultyColor(
  difficulty: string
): string {
  switch (
    difficulty.toLowerCase()
  ) {
    case 'easy':
      return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25'

    case 'medium':
      return 'bg-amber-500/15 text-amber-600 border-amber-500/25'

    case 'hard':
      return 'bg-red-500/15 text-red-600 border-red-500/25'

    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function computeStats(
  sections: GeneratedSection[]
) {
  let totalQuestions = 0
  let totalMarks = 0
  const byDifficulty: DifficultyStats = {
    easy: 0,
    medium: 0,
    hard: 0,
  }
  const byType: TypeStats = {}

  for (const section of sections) {
    let sectionMarks = 0

    for (const q of section.questions) {
      totalQuestions++
      const diff = q.difficulty?.toLowerCase() as DifficultyLevel

      if (diff && diff in byDifficulty) {
        byDifficulty[diff]++
      }

      const type = q.type || 'Unknown'
      byType[type] = (byType[type] || 0) + 1
      sectionMarks += Number(q.marks) || 1
    }

    totalMarks += Number(section.totalMarks) || sectionMarks
  }

  return {
    totalQuestions,
    totalMarks,
    byDifficulty,
    byType,
  }
}



function RadialScoreGauge({
  score,
  totalMarks,
}: {
  score: number
  totalMarks: number
}) {
  const percentage =
    totalMarks > 0
      ? (score / totalMarks) * 100
      : 0

  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset =
    circumference -
    (percentage / 100) * circumference

  let strokeColor = 'stroke-red-500'
  let textColor = 'text-red-500 font-extrabold'
  let bgColor = 'bg-red-500/5'
  let borderColor = 'border-red-500/15'

  if (percentage >= 75) {
    strokeColor = 'stroke-emerald-500'
    textColor = 'text-emerald-500 font-extrabold'
    bgColor = 'bg-emerald-500/5'
    borderColor = 'border-emerald-500/15'
  } else if (percentage >= 40) {
    strokeColor = 'stroke-amber-500'
    textColor = 'text-amber-500 font-extrabold'
    bgColor = 'bg-amber-500/5'
    borderColor = 'border-amber-500/15'
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border ${borderColor} ${bgColor} shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md`}>
      <div className="relative h-28 w-28">
        <svg className="h-full w-full -rotate-90">
          <circle
            cx="56"
            cy="56"
            r={radius}
            className="stroke-muted/40 fill-transparent"
            strokeWidth="7"
          />
          <circle
            cx="56"
            cy="56"
            r={radius}
            className={`${strokeColor} fill-transparent transition-all duration-1000 ease-out`}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl tracking-tight leading-none ${textColor}`}>
            {score.toFixed(1).replace('.0', '')}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">
            out of {totalMarks}
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Grade Percentage
      </p>
      <p className={`text-xl font-bold ${textColor} mt-0.5`}>
        {Math.round(percentage)}%
      </p>
    </div>
  )
}

const GRADING_STAGES = [
  '🚀 Uploading homework PDF to secure cloud storage...',
  '📸 Processing document pages as high-resolution images...',
  '📊 Analyzing and cross-referencing against official answer key...',
  '📝 Compiling scores and drafting personalized feedback report...',
]

export default function AssessmentDetailPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const isTeacher = getUserRole(user) === 'teacher'

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [submissionLoading, setSubmissionLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [gradingStage, setGradingStage] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const response = await fetch(`/api/assignments/${id}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        })

        const data = (await response.json()) as AssignmentResponse

        if (!response.ok) {
          throw new Error(data.error ?? 'Failed to load assignment')
        }

        if (isMounted) {
          setAssignment(data.assignment)

          if (data.assignment?.generated?.sections) {
            setExpandedSections(
              new Set(
                data.assignment.generated.sections.map((s: GeneratedSection) => s.title)
              )
            )
          }
        }

        const subRes = await fetch(`/api/submissions?assignmentId=${id}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        })

        const subData = (await subRes.json()) as SubmissionResponse

        if (
          isMounted &&
          subRes.ok &&
          subData.submissions &&
          subData.submissions.length > 0
        ) {
          setSubmission(subData.submissions[0])
        }
      } catch {
        if (isMounted) {
          showErrorToast()
          setLoadFailed(true)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
          setSubmissionLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [id])

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined

    if (submitting) {
      interval = setInterval(() => {
        setGradingStage((prev) => {
          if (prev < GRADING_STAGES.length - 1) {
            return prev + 1
          }
          return prev
        })
      }, 3500)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [submitting])

  function toggleSection(title: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      showErrorToast()
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      showErrorToast()
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  async function handleUploadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedFile) return

    setGradingStage(0)
    setSubmitting(true)

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('assignmentId', id)

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as SubmissionResponse
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to submit and grade assessment.')
      }

      if (data.submission) {
        setSubmission(data.submission)
        setSelectedFile(null)
      }
    } catch {
      showErrorToast()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || submissionLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          Retrieving assessment file & submissions...
        </p>
      </div>
    )
  }

  if (loadFailed) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12">
        <p className="text-sm text-muted-foreground">
          Unable to load this assessment. Please try again later.
        </p>
        <button
          type="button"
          onClick={() => router.push('/attend-assessments')}
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back to assessments
        </button>
      </div>
    )
  }

  if (!assignment) {
    return null
  }

  const sections = assignment.generated?.sections ?? []
  const isReady = sections.length > 0
  const stats = isReady ? computeStats(sections) : null

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <button
        type="button"
        onClick={() => router.push('/attend-assessments')}
        className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform group-hover:-translate-x-0.5"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to assessments
      </button>

      {submission && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Assessment Grade Report</p>
              <h2 className="text-2xl font-bold text-foreground mt-0.5">{assignment.title}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Submitted & graded on {new Date(submission.createdAt).toLocaleDateString()} at {new Date(submission.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <a
              href={submission.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted"
            >
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PDF Submission
            </a>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1 flex items-center justify-center">
              <RadialScoreGauge score={submission.score} totalMarks={submission.totalMarks} />
            </div>
            <div className="md:col-span-2 rounded-2xl border border-border bg-muted/10 p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">General Feedback Summary</h3>
                <p className="text-sm text-foreground leading-relaxed italic">
                  {submission.feedback || 'Excellent homework submission! You demonstrated an outstanding understanding of all assessment topics and applied the concepts correctly.'}
                </p>
              </div>
              <div className="border-t border-border mt-4 pt-3 flex justify-between items-center text-xs text-muted-foreground">
                <span>Model: gemini-2.5-flash</span>
                <span>Role: student</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Question-by-Question AI Evaluation</h3>
            <div className="grid gap-4">
              {submission.questionsFeedback?.map((qFeedback, idx) => {
                const percentage = qFeedback.maxMarks > 0 ? (qFeedback.marksObtained / qFeedback.maxMarks) * 100 : 0
                let badgeColor = 'bg-red-500/10 text-red-500 border-red-500/20'
                if (percentage >= 75) {
                  badgeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                } else if (percentage >= 40) {
                  badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }

                return (
                  <div key={idx} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3.5 hover:border-muted transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 max-w-[80%]">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                          {idx + 1}
                        </span>
                        <p className="text-sm font-medium text-foreground">{qFeedback.questionText}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}>
                        {qFeedback.marksObtained.toFixed(1).replace('.0', '')} / {qFeedback.maxMarks} Marks
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 bg-muted/15 rounded-xl p-3.5 border border-border/50">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Your Answer (AI Transcribed)</p>
                        <p className="text-xs text-foreground italic leading-relaxed">
                          {qFeedback.studentAnswerText || 'Not attempted / not found.'}
                        </p>
                      </div>
                      <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-border/70 pt-2.5 sm:pt-0 sm:pl-4">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">AI Review & Correction</p>
                        <p className="text-xs text-foreground leading-relaxed">
                          {qFeedback.feedback || 'Answer matches official answer key completely.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {submitting && (
        <div className="rounded-2xl border border-dashed border-primary bg-card/40 backdrop-blur-md p-10 flex flex-col items-center justify-center text-center space-y-6 shadow-lg min-h-[300px]">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground animate-pulse">Running AI Homework Grader...</h3>
            <p className="text-sm text-primary font-semibold transition-all duration-500 ease-out">{GRADING_STAGES[gradingStage]}</p>
            <p className="text-xs text-muted-foreground pt-1">This typically takes 15-20 seconds to run deep OCR multimodal checking.</p>
          </div>
        </div>
      )}

      {!submission && !submitting && isReady && !isTeacher && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Submission Area</p>
            <h2 className="text-lg font-bold text-foreground mt-0.5">Submit Your Hand-written or Typed PDF</h2>
            <p className="text-xs text-muted-foreground mt-1">Upload a PDF containing your answers. Our Gemini AI will parse and grade each question against the teacher answer key automatically.</p>
          </div>
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-300 ${isDragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/40 hover:border-muted'}`}
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="p-3 bg-muted rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M12 18v-6" />
                    <polyline points="9 15 12 12 15 15" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">{selectedFile ? selectedFile.name : 'Drag & drop your assessment PDF here'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF papers up to 10MB'}</p>
                </div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted">
                  Choose PDF file
                  <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!selectedFile}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🚀 Grade My Submission
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Original Assessment Paper</h3>
          {submission && !isTeacher && (
            <p className="text-xs text-muted-foreground">Submit another file by refreshing the page if needed.</p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Assignment ID: {assignment._id}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{assignment.title || 'Assessment'}</h1>
            </div>
            <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${isReady ? 'border-emerald-500/25 bg-emerald-500/15 text-emerald-600' : 'border-amber-500/25 bg-amber-500/15 text-amber-600'}`}>
              {isReady ? '✓ READY' : '⏳ PENDING'}
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Due Date</p>
              <p className="mt-1 text-sm font-medium text-foreground"><ClientFormattedDate value={assignment.dueDate} /></p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Questions</p>
              <p className="mt-1 text-sm font-medium text-foreground">{stats?.totalQuestions ?? '—'}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Total Marks</p>
              <p className="mt-1 text-sm font-medium text-foreground">{assignment.generated?.totalMarks ?? assignment.questionTypes.reduce((sum, item) => sum + item.numberOfQuestions * item.marksPerQuestion, 0)}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Created</p>
              <p className="mt-1 text-sm font-medium text-foreground"><ClientFormattedDate value={assignment.createdAt} /></p>
            </div>
          </div>
        </div>

        {stats ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Difficulty Breakdown</h2>
              <div className="mt-3 space-y-2">
                {(['easy', 'medium', 'hard'] as const).map((level) => {
                  const count = stats.byDifficulty[level]
                  const pct = stats.totalQuestions > 0 ? (count / stats.totalQuestions) * 100 : 0
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize text-muted-foreground">{level}</span>
                        <span className="font-medium text-foreground">{count} ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className={`h-2 rounded-full transition-all ${level === 'easy' ? 'bg-emerald-500' : level === 'medium' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Question Types</h2>
              <div className="mt-3 space-y-2">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                    <span className="text-sm text-foreground">{type}</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {!isReady ? (
          <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-8 text-center">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-amber-500/30 border-t-amber-500" />
            <p className="text-sm font-medium text-amber-600">Questions are still being generated for this assessment.</p>
            <p className="mt-1 text-xs text-muted-foreground">This page will show the full paper once generation is complete. Refresh to check again.</p>
          </div>
        ) : null}

        {sections.map((section, sectionIdx) => {
          const isExpanded = expandedSections.has(section.title)
          return (
            <div key={section.title} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{String.fromCharCode(65 + sectionIdx)}</span>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
                    <p className="text-xs text-muted-foreground">{section.questions.length} question{section.questions.length !== 1 ? 's' : ''} · {section.totalMarks} marks</p>
                  </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {isExpanded && section.instructions ? (
                <div className="border-t border-border bg-muted/10 px-6 py-3">
                  <p className="text-xs text-muted-foreground italic">{section.instructions}</p>
                </div>
              ) : null}
              {isExpanded ? (
                <div className="divide-y divide-border border-t border-border">
                  {section.questions.map((question, qIdx) => (
                    <div key={`${section.title}-${qIdx}`} className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{qIdx + 1}</span>
                        <div className="flex-1 space-y-2">
                          <p className="text-sm leading-relaxed text-foreground">{question.questionText}</p>
                          {question.options?.length ? (
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              {question.options.map((option, oIdx) => (
                                <div key={option} className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground">
                                  <span className="mr-2 font-medium text-muted-foreground">{String.fromCharCode(65 + oIdx)}.</span>
                                  {option}
                                </div>
                              ))}
                            </div>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${difficultyColor(question.difficulty)}`}>{question.difficulty}</span>
                            <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">{question.type}</span>
                            <span className="text-[11px] text-muted-foreground">{question.marks} mark{question.marks !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}

        {isReady ? (
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-4 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{stats?.totalQuestions} questions · {stats?.totalMarks} marks · {sections.length} section{sections.length !== 1 ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground/70">ID: {assignment._id}</p>
            </div>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Paper
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
