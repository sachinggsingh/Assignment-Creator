'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import type { RootState } from '@/lib/store'
import type {  GeneratedSection, GeneratedQuestion } from '@/types/type'
import { ClientFormattedDate } from '@/components/client-formatted-date'
import { resetAssignmentStatus, clearFormSnapshot, discardAssignment } from '@/lib/features/assignments/assignmentSlice'
import { Database, Trash } from 'lucide-react'
export default function AssessmentOutputPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { status, createdAssignment, error } = useAppSelector((s: RootState) => s.assignments)

  useEffect(() => {
    if (!createdAssignment && status !== 'loading') {
      router.push('/create-assessments')
    }
  }, [createdAssignment, status, router])

  if (status === 'loading' && !createdAssignment) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Generating</p>
            <p className="mt-1 text-sm text-foreground">Your assessment is being generated. This may take a minute.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!createdAssignment) return null

  const handleSave = () => {
    dispatch(resetAssignmentStatus())
    dispatch(clearFormSnapshot())
    router.push('/dashboard')
  }

  const handleRegenerate = async () => {
    if (!createdAssignment?._id) return
    try {
      await dispatch(discardAssignment(createdAssignment._id)).unwrap()
      router.push('/create-assessments')
    } catch (err) {
      console.error('Failed to discard assignment', err)
    }
  }

  const generated = createdAssignment.generated as { sections: GeneratedSection[]; totalMarks: number } | undefined

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Preview</p>
        <h1 className="text-2xl font-semibold text-foreground">Assessment output</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 max-w-4xl mx-auto shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Generated paper</p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">{createdAssignment.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Due <ClientFormattedDate value={createdAssignment.dueDate} /> • {generated?.sections.length ?? 0} sections • {generated?.totalMarks ?? 0} marks
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Database/> Publish
            </button>
            <button
              onClick={handleRegenerate}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
            >
              <Trash /> Regenerate
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-500">{String(error)}</p>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {generated?.sections.map((section: GeneratedSection) => (
            <div key={section.title} className="rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              {section.instructions ? (
                <p className="mt-1 text-xs text-muted-foreground">{section.instructions}</p>
              ) : null}
              <ol className="mt-3 space-y-3">
                {section.questions.map((question: GeneratedQuestion, index: number) => (
                  <li key={`${section.title}-${index}`} className="text-sm text-foreground">
                    <span className="font-medium">Q{index + 1}.</span> {question.questionText}
                    <span className="ml-2 text-xs text-muted-foreground">({question.type}, {question.marks} marks, {question.difficulty})</span>
                    {question.options && question.options.length > 0 ? (
                      <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                        {question.options.map((option: string) => (
                          <li key={option}>{option}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
