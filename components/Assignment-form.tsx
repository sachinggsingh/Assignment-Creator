'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Info, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { showErrorToast } from '@/lib/toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'

import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import type { RootState } from '@/lib/store'

import {
  createAssignment,
  resetAssignmentStatus,
  setFormSnapshot,
} from '@/lib/features/assignments/assignmentSlice'

import {
  ASSIGNMENT_QUESTION_TYPES,
  type AssignmentQuestionType,
  type CreateAssignmentPayload,
  type DifficultyLevel,
  type QuestionTypePayload,
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
          .refine(
            (value) =>
              Number.isInteger(Number(value)) &&
              Number(value) >= 1,
            {
              message: 'Must be a whole number > 0',
            }
          ),

        marksPerQuestion: z
          .string()
          .trim()
          .min(1, 'Required')
          .refine(
            (value) =>
              Number.isInteger(Number(value)) &&
              Number(value) >= 1,
            {
              message: 'Must be a whole number > 0',
            }
          ),
      })
    )
    .min(1, 'Add at least one section'),

  additionalInstructions: z.string().optional(),
})

type AssignmentFormData = z.infer<typeof assignmentSchema>

const DIFFICULTY_OPTIONS: Array<{
  id: DifficultyLevel
  label: string
}> = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
]

function normalizeDueDate(value: string): string {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toISOString()
}

function buildQuestionTypesFromConfig(
  config: AssignmentFormData['questionConfig']
): QuestionTypePayload[] {
  return config.map((row) => ({
    type: row.type,
    difficulty: row.difficulty,
    numberOfQuestions: Number(row.numberOfQuestions),
    marksPerQuestion: Number(row.marksPerQuestion),
  }))
}

export function AssignmentForm() {
  const router = useRouter()

  const dispatch = useAppDispatch()

  const { status, error, formSnapshot } =
    useAppSelector(
      (state: RootState) => state.assignments
    )

  const submitInFlightRef = useRef(false)

  useEffect(() => {
    if (error) {
      showErrorToast()
    }
  }, [error])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control,
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),

    defaultValues: formSnapshot
      ? {
          title: formSnapshot.title,

          dueDate: formSnapshot.dueDate,

          questionConfig:
            formSnapshot.questionTypes.map(
              (q: QuestionTypePayload) => ({
                type: q.type,
                difficulty:
                  (q.difficulty as DifficultyLevel) ||
                  'medium',
                numberOfQuestions: String(
                  q.numberOfQuestions
                ),
                marksPerQuestion: String(
                  q.marksPerQuestion
                ),
              })
            ),

          additionalInstructions:
            formSnapshot.additionalInstructions ??
            '',
        }
      : {
          questionConfig: [
            {
              type: 'MCQ',
              difficulty: 'medium',
              numberOfQuestions: '5',
              marksPerQuestion: '2',
            },
          ],
        },
  })

  const { fields, append, remove, replace } =
    useFieldArray({
      control,
      name: 'questionConfig',
    })

  const questionConfig = watch('questionConfig')

  const totals = useMemo(() => {
    const totalQuestions = (
      questionConfig ?? []
    ).reduce(
      (sum, row) =>
        sum +
        Number(row?.numberOfQuestions ?? 0),
      0
    )

    const totalMarks = (
      questionConfig ?? []
    ).reduce(
      (sum, row) =>
        sum +
        Number(row?.numberOfQuestions ?? 0) *
          Number(row?.marksPerQuestion ?? 0),
      0
    )

    return {
      totalQuestions,
      totalMarks,
    }
  }, [questionConfig])

  const buildPayload = (
    data: AssignmentFormData
  ): CreateAssignmentPayload | null => {
    const hasInvalidType =
      data.questionConfig.some(
        (row) =>
          !ASSIGNMENT_QUESTION_TYPES.includes(
            row.type as AssignmentQuestionType
          )
      )

    if (hasInvalidType) {
      showErrorToast()
      return null
    }

    return {
      title: data.title,

      dueDate: normalizeDueDate(data.dueDate),

      questionTypes:
        buildQuestionTypesFromConfig(
          data.questionConfig
        ),

      additionalInstructions:
        data.additionalInstructions,
    }
  }

  const onSubmit = async (
    data: AssignmentFormData
  ) => {
    const payload = buildPayload(data)

    if (
      !payload ||
      submitInFlightRef.current
    ) {
      return
    }

    submitInFlightRef.current = true

    try {
      dispatch(setFormSnapshot(payload))
      void dispatch(createAssignment(payload))
      router.push('/assessment-output')
    } catch {
      showErrorToast()
    } finally {
      submitInFlightRef.current = false
    }
  }

  const isLoading = status === 'loading'

  return (
    <div className="mx-auto w-full max-w-4xl">
      <form
        onSubmit={(e) =>
          void handleSubmit(onSubmit)(e)
        }
        className="space-y-8"
      >
        <div className="space-y-2">
          <Label
            htmlFor="title"
            className="text-base font-semibold"
          >
            Assignment Title{' '}
            <span className="text-red-500">
              *
            </span>
          </Label>

          <Input
            id="title"
            placeholder="e.g., Midterm Exam"
            className="bg-card border-border text-foreground"
            disabled={isLoading}
            {...register('title')}
          />

          {errors.title && (
            <p className="text-sm text-red-500">
              {errors.title.message as string}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-dashed border-border bg-muted/40 p-4 transition hover:border-primary/70 ">
            <button
              type="button"
              onClick={() =>
                toast(
                  'Upload functionality coming soon'
                )
              }
              className="group flex w-full items-center gap-4 rounded-3xl bg-card px-4 py-4 text-left transition"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud className="h-6 w-6" />
              </span>

              <span className="grid flex-1 gap-1">
                <span className="text-sm font-semibold">
                  Upload assignment resources
                </span>

                <span className="text-sm text-muted-foreground">
                  Click to upload template or
                  supporting file.
                </span>
              </span>

              <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                Coming soon
              </span>
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label
                htmlFor="dueDate"
                className="text-base font-semibold"
              >
                Due Date{' '}
                <span className="text-red-500">
                  *
                </span>
              </Label>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
                  >
                    <Info className="h-4 w-4" />
                    Due date help
                  </button>
                </PopoverTrigger>

                <PopoverContent className="w-full max-w-sm sm:w-auto">
                  <PopoverHeader>
                    <PopoverTitle>
                      Due date guidance
                    </PopoverTitle>
                  </PopoverHeader>

                  <PopoverDescription>
                    Select the deadline date and
                    time students must submit the
                    assessment.
                  </PopoverDescription>
                </PopoverContent>
              </Popover>
            </div>

            <Input
              id="dueDate"
              type="datetime-local"
              className="bg-card border-border text-foreground"
              disabled={isLoading}
              {...register('dueDate')}
            />

            {errors.dueDate && (
              <p className="text-sm text-red-500">
                {errors.dueDate.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <Label className="text-base font-semibold">
                Question configuration
              </Label>

              <p className="text-sm text-muted-foreground">
                Configure sections, difficulty,
                marks, and question count.
              </p>
            </div>

            <Button
              type="button"
              disabled={isLoading}
              onClick={() =>
                append({
                  type: 'Short Answer',
                  difficulty: 'medium',
                  numberOfQuestions: '5',
                  marksPerQuestion: '2',
                })
              }
            >
              Add section
            </Button>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-12"
              >
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Section
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {`Section ${String.fromCharCode(
                      65 + index
                    )}`}
                  </p>
                </div>

                <div className="space-y-1 md:col-span-4">
                  <Label className="text-xs text-muted-foreground">
                    Type
                  </Label>

                  <select
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    disabled={isLoading}
                    {...register(
                      `questionConfig.${index}.type`
                    )}
                  >
                    {ASSIGNMENT_QUESTION_TYPES.map(
                      (t) => (
                        <option
                          key={t}
                          value={t}
                        >
                          {t}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">
                    Difficulty
                  </Label>

                  <select
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    disabled={isLoading}
                    {...register(
                      `questionConfig.${index}.difficulty`
                    )}
                  >
                    {DIFFICULTY_OPTIONS.map(
                      (d) => (
                        <option
                          key={d.id}
                          value={d.id}
                        >
                          {d.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">
                    Questions
                  </Label>

                  <Input
                    type="number"
                    min="1"
                    step="1"
                    disabled={isLoading}
                    {...register(
                      `questionConfig.${index}.numberOfQuestions`
                    )}
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">
                    Marks/Q
                  </Label>

                  <Input
                    type="number"
                    min="1"
                    step="1"
                    disabled={isLoading}
                    {...register(
                      `questionConfig.${index}.marksPerQuestion`
                    )}
                  />
                </div>

                <div className="flex items-center justify-between pt-1 md:col-span-12">
                  <p className="text-xs text-muted-foreground">
                    Section total:{' '}
                    {Number(
                      questionConfig?.[index]
                        ?.numberOfQuestions ?? 0
                    ) *
                      Number(
                        questionConfig?.[index]
                          ?.marksPerQuestion ?? 0
                      )}{' '}
                    marks
                  </p>

                  <Button
                    type="button"
                    disabled={
                      isLoading ||
                      fields.length === 1
                    }
                    variant="outline"
                    onClick={() =>
                      remove(index)
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <p className="text-sm text-muted-foreground">
                Total:{' '}
                <span className="font-semibold text-foreground">
                  {totals.totalQuestions}
                </span>{' '}
                questions •{' '}
                <span className="font-semibold text-foreground">
                  {totals.totalMarks}
                </span>{' '}
                marks
              </p>

              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() =>
                  replace([
                    {
                      type: 'MCQ',
                      difficulty: 'medium',
                      numberOfQuestions: '5',
                      marksPerQuestion: '2',
                    },
                  ])
                }
              >
                Reset sections
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="additionalInstructions"
            className="text-base font-semibold"
          >
            Additional Instructions
          </Label>

          <Textarea
            id="additionalInstructions"
            placeholder="e.g., Show all workings..."
            className="resize-none bg-card border-border text-foreground"
            rows={4}
            disabled={isLoading}
            {...register(
              'additionalInstructions'
            )}
          />
        </div>

        <div className="flex gap-4 pt-6">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading
              ? 'Generating...'
              : 'Create Assignment'}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => {
              reset()
              dispatch(resetAssignmentStatus())
            }}
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
  )
}