'use client'

import { ClientFormattedDate } from '@/components/client-formatted-date'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { ASSIGNMENT_QUESTION_TYPES } from '@/types/type'
import { createAssignment, resetAssignmentStatus } from '@/lib/features/assignments/assignmentSlice'
import type {
  CreateAssignmentPayload,
  DifficultyLevel,
  GeneratedSection,
  QuestionTypePayload,
} from '@/types/type'

const assignmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  questionConfig: z
    .array(
      z.object({
        type: z.string().min(1, 'Type is required'),
        difficulty: z.enum(['easy', 'medium', 'hard']),
        numberOfQuestions: z
          .string()
          .trim()
          .min(1, 'Required')
          .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 1, {
            message: 'Must be a whole number > 0',
          }),
        marksPerQuestion: z
          .string()
          .trim()
          .min(1, 'Required')
          .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 1, {
            message: 'Must be a whole number > 0',
          }),
      })
    )
    .min(1, 'Add at least one section'),
  additionalInstructions: z.string().optional(),
})

type AssignmentFormData = z.infer<typeof assignmentSchema>

function normalizeDueDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toISOString()
}

const DIFFICULTY_OPTIONS: Array<{ id: DifficultyLevel; label: string }> = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
]

function buildQuestionTypesFromConfig(config: AssignmentFormData['questionConfig']): QuestionTypePayload[] {
  return config.map((row) => ({
    type: row.type,
    difficulty: row.difficulty,
    numberOfQuestions: Number(row.numberOfQuestions),
    marksPerQuestion: Number(row.marksPerQuestion),
  }))
}

function GeneratedPreview({
  title,
  dueDate,
  questionTypes,
  generated,
}: {
  title: string
  dueDate: string
  questionTypes: { type: string }[]
  generated: {
    totalMarks: number
    sections: GeneratedSection[]
  }
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm font-semibold text-foreground">Assignment preview</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Due date</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            <ClientFormattedDate value={dueDate} />
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Question types</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {questionTypes.map((item) => item.type).join(', ')}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Title</p>
        <p className="mt-1 text-sm text-foreground">
          {title}
        </p>
      </div>
      <div className="mt-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Generated paper</p>
          <p className="mt-1 text-sm text-foreground">
            {generated.sections.length} section(s),{' '}
            {generated.sections.reduce((sum, section) => sum + section.questions.length, 0)} questions,{' '}
            {generated.totalMarks} total marks
          </p>
        </div>
        {generated.sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-border bg-muted/20 p-4">
            <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
            {section.instructions ? (
              <p className="mt-1 text-xs text-muted-foreground">{section.instructions}</p>
            ) : null}
            <ol className="mt-3 space-y-3">
              {section.questions.map((question, index) => (
                <li key={`${section.title}-${index}`} className="text-sm text-foreground">
                  <span className="font-medium">Q{index + 1}.</span> {question.questionText}
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({question.type}, {question.marks} marks, {question.difficulty})
                  </span>
                  {question.options && question.options.length > 0 ? (
                    <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                      {question.options.map((option) => (
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
  )
}

export function AssignmentForm() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { status, error, createdAssignment } = useAppSelector((state) => state.assignments)
  const [formError, setFormError] = useState<string | null>(null)
  const submitInFlightRef = useRef(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control,
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      questionConfig: [
        { type: 'MCQ', difficulty: 'medium', numberOfQuestions: '5', marksPerQuestion: '2' },
      ],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'questionConfig',
  })

  const questionConfig = watch('questionConfig')
  const totals = useMemo(() => {
    const totalQuestions = (questionConfig ?? []).reduce((sum, row) => sum + Number(row?.numberOfQuestions ?? 0), 0)
    const totalMarks = (questionConfig ?? []).reduce(
      (sum, row) => sum + Number(row?.numberOfQuestions ?? 0) * Number(row?.marksPerQuestion ?? 0),
      0
    )
    return { totalQuestions, totalMarks }
  }, [questionConfig])

  const buildPayload = (data: AssignmentFormData): CreateAssignmentPayload | null => {
    const hasInvalidType = data.questionConfig.some((row) => !ASSIGNMENT_QUESTION_TYPES.includes(row.type as any))
    if (hasInvalidType) {
      setFormError('Please choose a valid question type for every section')
      return null
    }

    return {
      title: data.title,
      dueDate: normalizeDueDate(data.dueDate),
      questionTypes: buildQuestionTypesFromConfig(data.questionConfig),
      additionalInstructions: data.additionalInstructions,
    }
  }

  const onSubmit = async (data: AssignmentFormData) => {
    const payload = buildPayload(data)
    if (!payload || submitInFlightRef.current) {
      return
    }

    submitInFlightRef.current = true
    setFormError(null)

    try {
      await dispatch(createAssignment(payload)).unwrap()
      reset()
      toast.success("Assignment created successfully!")
      router.push('/attend-assessments')
    } catch (err: any) {
      toast.error(err?.message || err || "Failed to create assignment")
    } finally {
      submitInFlightRef.current = false
    }
  }

  const isLoading = status === 'loading'

  return (
    <div className="w-full max-w-4xl mx-auto">
      {status === 'succeeded' && createdAssignment?.generated && (
        <div className="mb-6 space-y-4">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
            <Check size={20} className="text-green-500" />
            <p className="text-green-500">Assignment created successfully.</p>
          </div>
          <GeneratedPreview
            title={createdAssignment.title}
            dueDate={createdAssignment.dueDate}
            questionTypes={createdAssignment.questionTypes}
            generated={createdAssignment.generated}
          />
        </div>
      )}

      {(formError || error) && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-red-500">{formError ?? error}</p>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-base font-semibold text-foreground dark:text-white">
            Assignment Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            placeholder="e.g., Midterm Exam"
            className="bg-card dark:bg-[#141d3e] border-border dark:border-[#1e2749] text-foreground dark:text-white"
            disabled={isLoading}
            {...register('title')}
          />
          {errors.title && <p className="text-red-500 text-sm">{errors.title.message as string}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate" className="text-base font-semibold text-foreground dark:text-white">
            Due Date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="dueDate"
            type="datetime-local"
            className="bg-card dark:bg-[#141d3e] border-border dark:border-[#1e2749] text-foreground dark:text-white"
            disabled={isLoading}
            {...register('dueDate')}
          />
          {errors.dueDate && <p className="text-red-500 text-sm">{errors.dueDate.message}</p>}
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <Label className="text-base font-semibold text-foreground dark:text-white">
                Question configuration <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Each row becomes a section. Set type, difficulty, question count, and marks per question.
              </p>
            </div>
            <Button
              type="button"
              disabled={isLoading}
              className="px-4"
              onClick={() =>
                append({ type: 'Short Answer', difficulty: 'medium', numberOfQuestions: '5', marksPerQuestion: '2' })
              }
            >
              Add section
            </Button>
          </div>

          {errors.questionConfig?.message ? (
            <p className="text-red-500 text-sm">{errors.questionConfig.message as string}</p>
          ) : null}

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded-lg border border-border bg-muted/20 p-3"
              >
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Section</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{`Section ${String.fromCharCode(65 + index)}`}</p>
                </div>

                <div className="md:col-span-4 space-y-1">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <select
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
                    disabled={isLoading}
                    {...register(`questionConfig.${index}.type`)}
                  >
                    {ASSIGNMENT_QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Difficulty</Label>
                  <select
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
                    disabled={isLoading}
                    {...register(`questionConfig.${index}.difficulty`)}
                  >
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Questions</Label>
                  <Input type="number" min="1" step="1" disabled={isLoading} {...register(`questionConfig.${index}.numberOfQuestions`)} />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Marks/Q</Label>
                  <Input type="number" min="1" step="1" disabled={isLoading} {...register(`questionConfig.${index}.marksPerQuestion`)} />
                </div>

                <div className="md:col-span-12 flex items-center justify-between pt-1">
                  <p className="text-xs text-muted-foreground">
                    Section total:{' '}
                    {Number(questionConfig?.[index]?.numberOfQuestions ?? 0) *
                      Number(questionConfig?.[index]?.marksPerQuestion ?? 0)}{' '}
                    marks
                  </p>
                  <Button type="button" disabled={isLoading || fields.length === 1} className="px-3" onClick={() => remove(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{totals.totalQuestions}</span> questions •{' '}
                <span className="font-semibold text-foreground">{totals.totalMarks}</span> marks
              </p>
              <Button
                type="button"
                disabled={isLoading}
                className="px-4"
                onClick={() => replace([{ type: 'MCQ', difficulty: 'medium', numberOfQuestions: '5', marksPerQuestion: '2' }])}
              >
                Reset sections
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalInstructions" className="text-base font-semibold text-foreground dark:text-white">
            Additional Instructions <span className="text-muted-foreground text-sm">(Optional)</span>
          </Label>
          <Textarea
            id="additionalInstructions"
            placeholder="e.g., Show all workings, cite sources..."
            className="bg-card dark:bg-[#141d3e] border-border dark:border-[#1e2749] text-foreground dark:text-white resize-none"
            rows={4}
            disabled={isLoading}
            {...register('additionalInstructions')}
          />
        </div>

        <div className="flex gap-4 pt-6">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-primary to-secondary text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Generating and saving...' : 'Create Assignment'}
          </Button>
          <Button
            type="button"
            onClick={() => {
              reset()
              setFormError(null)
              dispatch(resetAssignmentStatus())
            }}
            disabled={isLoading}
            className="px-6 border-2 border-border text-foreground bg-transparent rounded-lg font-semibold"
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
  )
}
