import { getAuthUser } from '@/lib/auth/session'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Assignment as AssignmentModel } from '@/models/assignment'
import { GeneratedAssignment } from '@/models/generatedAssignment'
import { SubmitAssignment } from '@/models/submitAssignment'
import { assignmentQueue } from '@/lib/bullmq/queue/assignment.queue'

import type {
  Assignment,
  CreateAssignmentPayload,
  QuestionTypePayload,
} from '@/types/type'

export const maxDuration = 300

type Body = {
  title: string
  dueDate: string

  questionTypes: {
    type: string
    difficulty: 'easy' | 'medium' | 'hard'
    numberOfQuestions: number
    marksPerQuestion: number
  }[]

  additionalInstructions?: string
}

// Internal parsing types removed to avoid unused-type lint warnings

function parseBody(
  body: Body
): CreateAssignmentPayload {
  if (!body) {
    throw new Error('Invalid request body')
  }

  const {
    title,
    dueDate,
    questionTypes,
    additionalInstructions,
  } = body as Record<string, unknown>

  if (!title || typeof title !== 'string') {
    throw new Error('Title is required')
  }

  if (
    !dueDate ||
    typeof dueDate !== 'string'
  ) {
    throw new Error('Due date is required')
  }

  if (
    !Array.isArray(questionTypes) ||
    questionTypes.length === 0
  ) {
    throw new Error(
      'At least one question type is required'
    )
  }

  const parsedTypes: QuestionTypePayload[] =
    questionTypes.map((item) => {
      if (
        !item ||
        typeof item !== 'object'
      ) {
        throw new Error(
          'Invalid question type'
        )
      }

      const row =
        item as Record<string, unknown>

      const numberOfQuestions = Number(
        row.numberOfQuestions
      )

      const marksPerQuestion = Number(
        row.marksPerQuestion
      )

      const validTypes = [
        'MCQ',
        'Short Answer',
        'Long Answer',
        'True/False',
      ]

      if (
        !row.type ||
        typeof row.type !== 'string' ||
        !validTypes.includes(row.type)
      ) {
        throw new Error(
          'Invalid question type'
        )
      }

      if (
        !row.difficulty ||
        !['easy', 'medium', 'hard'].includes(
          String(row.difficulty)
        )
      ) {
        throw new Error(
          'Invalid difficulty'
        )
      }

      if (
        !Number.isFinite(
          numberOfQuestions
        ) ||
        numberOfQuestions < 1
      ) {
        throw new Error(
          'Question count must be greater than 0'
        )
      }

      if (
        !Number.isFinite(
          marksPerQuestion
        ) ||
        marksPerQuestion < 1
      ) {
        throw new Error(
          'Marks per question must be greater than 0'
        )
      }

      return {
        type: row.type,
        difficulty: String(
          row.difficulty
        ) as
          | 'easy'
          | 'medium'
          | 'hard',
        numberOfQuestions,
        marksPerQuestion,
      }
    })

  return {
    title,
    dueDate,
    questionTypes: parsedTypes,
    additionalInstructions:
      typeof additionalInstructions ===
        'string'
        ? additionalInstructions
        : undefined,
  }
}

function toAssignmentResponse(
  assignment: {
    _id: unknown
    title: string
    dueDate: Date
    questionTypes: QuestionTypePayload[]
    createdAt: Date
    updatedAt: Date
  },

  generated: {
    _id: unknown
    totalMarks: number
    sections: Record<string, unknown>[]
  } | null,

  includeAnswers: boolean
): Assignment {
  const mapSections = (
    sections: Record<string, unknown>[]
  ) =>
    sections.map((section) => ({
      title: String(section.title),

      instructions:
        section.instructions as
        | string
        | undefined,

      totalMarks: Number(
        section.totalMarks
      ),

      questions: (
        section.questions as Record<
          string,
          unknown
        >[]
      ).map((q) => ({
        questionText: String(
          q.questionText ||
          q.question ||
          ''
        ),

        difficulty: String(
          q.difficulty || 'medium'
        ),

        marks: Number(q.marks || 1),

        type: String(q.type || 'MCQ'),

        options: Array.isArray(
          q.options
        )
          ? q.options.map(String)
          : [],

        ...(includeAnswers &&
          q.answer
          ? {
            answer: String(
              q.answer
            ),
          }
          : {}),
      })),
    }))

  return {
    _id: String(assignment._id),

    title: String(assignment.title),

    dueDate:
      assignment.dueDate.toISOString(),

    questionTypes:
      assignment.questionTypes,

    createdAt:
      assignment.createdAt.toISOString(),

    updatedAt:
      assignment.updatedAt.toISOString(),

    generated: generated
      ? {
        _id: String(generated._id),

        totalMarks:
          generated.totalMarks,

        sections: mapSections(
          generated.sections
        ),
      }
      : null,
  }
}


export async function POST(
  request: Request
) {
  try {
    console.log(
      '[POST /api/assignments] Starting request...'
    )

    const user = await getAuthUser(
      request
    )

    if (!user) {
      console.log(
        '[POST /api/assignments] Unauthorized'
      )

      return NextResponse.json(
        {
          error: 'Unauthorized',
        },
        {
          status: 401,
        }
      )
    }

    if (user.role !== 'teacher') {
      return NextResponse.json(
        {
          error: 'Forbidden',
        },
        {
          status: 403,
        }
      )
    }

    console.log(
      `[POST /api/assignments] User verified: ${user.id}`
    )

    const input = parseBody(
      await request.json()
    )

    console.log(
      '[POST /api/assignments] Input validated.'
    )

    const dueDate = new Date(
      input.dueDate
    )

    if (
      Number.isNaN(dueDate.getTime())
    ) {
      return NextResponse.json(
        {
          error:
            'Due date must be a valid date',
        },
        {
          status: 400,
        }
      )
    }

    // Enqueue the job to BullMQ instead of running synchronously
    const job = await assignmentQueue.add(
      'generate-assignment',
      {
        title: input.title,
        dueDate: input.dueDate,
        questionTypes: input.questionTypes,
        additionalInstructions: input.additionalInstructions,
        createdBy: user.id,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    )

    console.log(
      `[POST /api/assignments] Job enqueued: ${job.id}`
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Assignment generation started',
        jobId: job.id,
      },
      {
        status: 202,
      }
    )
  } catch (error) {
    console.error(
      '[POST /api/assignments] Error occurred:',
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to start assignment generation'

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    )
  }
}

export async function GET(
  request: Request
) {
  try {
    const user = await getAuthUser(
      request
    )

    if (!user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
        },
        {
          status: 401,
        }
      )
    }

    await connectDB()

    const query =
      user.role === 'student'
        ? {}
        : {
          createdBy: user.id,
        }

    const assignments =
      await AssignmentModel.find(
        query
      )
        .sort({
          createdAt: -1,
        })
        .lean()

    let visibleAssignments =
      assignments

    if (user.role === 'student') {
      const submittedAssignmentIds =
        await SubmitAssignment.distinct(
          'assignmentId',
          {
            studentId: user.id,
          }
        )

      const submittedSet =
        new Set(
          submittedAssignmentIds.map(
            (id) => String(id)
          )
        )

      visibleAssignments =
        assignments.filter(
          (assignment) =>
            !submittedSet.has(
              String(
                assignment._id
              )
            )
        )
    }

    const assignmentIds =
      visibleAssignments.map(
        (item) => item._id
      )

    const generatedList =
      await GeneratedAssignment.find(
        {
          assignmentId: {
            $in: assignmentIds,
          },
        }
      ).lean()

    const generatedByAssignmentId =
      new Map(
        generatedList.map((item) => [
          String(item.assignmentId),
          item,
        ])
      )

    return NextResponse.json(
      {
        assignments:
          visibleAssignments.map(
            (assignment) => {
              const generated =
                generatedByAssignmentId.get(
                  String(
                    assignment._id
                  )
                )

              return toAssignmentResponse(
                {
                  _id:
                    assignment._id,

                  title:
                    assignment.title,

                  dueDate:
                    assignment.dueDate,

                  questionTypes:
                    assignment.questionTypes,

                  createdAt:
                    assignment.createdAt,

                  updatedAt:
                    assignment.updatedAt,
                },

                generated
                  ? {
                    _id:
                      generated._id,

                    totalMarks:
                      generated.totalMarks,

                    sections:
                      generated.sections as Record<
                        string,
                        unknown
                      >[],
                  }
                  : null,

                false
              )
            }
          ),
      },
      {
        status: 200,
      }
    )
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch assignments'

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    )
  }
}