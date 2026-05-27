// import { APICallError } from '@ai-sdk/provider'
// import { getAuthUser } from '@/lib/auth/session'
// import { NextResponse } from 'next/server'
// import { generateAssignment } from '@/lib/ai/generate-assignment'
// import { formatAiError } from '@/lib/ai/errors'
// import { connectDB } from '@/lib/db'
// import { Assignment as AssignmentModel } from '@/models/assignment'
// import { GeneratedAssignment } from '@/models/generatedAssignment'
// import { SubmitAssignment } from '@/models/submitAssignment'

// import type {
//   Assignment,
//   CreateAssignmentPayload,
//   QuestionTypePayload,
// } from '@/types/type'

// export const maxDuration = 300
// type Body = {
//   title: string
//   dueDate: string

//   questionTypes: {
//     type: string
//     difficulty: 'easy' | 'medium' | 'hard'
//     numberOfQuestions: number
//     marksPerQuestion: number
//   }[]

//   additionalInstructions?: string
// }
// function parseBody(body: Body): CreateAssignmentPayload {
//   if (!body) {
//     throw new Error('Invalid request body')
//   }

//   const {
//     title,
//     dueDate,
//     questionTypes,
//     additionalInstructions,
//   } = body as Record<string, unknown>

//   if (!title || typeof title !== 'string') {
//     throw new Error('Title is required')
//   }

//   if (!dueDate || typeof dueDate !== 'string') {
//     throw new Error('Due date is required')
//   }

//   if (
//     !Array.isArray(questionTypes) ||
//     questionTypes.length === 0
//   ) {
//     throw new Error(
//       'At least one question type is required'
//     )
//   }

//   const parsedTypes: QuestionTypePayload[] =
//     questionTypes.map((item) => {
//       if (!item || typeof item !== 'object') {
//         throw new Error('Invalid question type')
//       }

//       const row = item as Record<string, unknown>

//       const numberOfQuestions = Number(
//         row.numberOfQuestions
//       )

//       const marksPerQuestion = Number(
//         row.marksPerQuestion
//       )

//       const validTypes = [
//         'MCQ',
//         'Short Answer',
//         'Long Answer',
//         'True/False',
//       ]
//       if (
//         !row.type ||
//         typeof row.type !== 'string' ||
//         !validTypes.includes(row.type)
//       ) {
//         throw new Error('Invalid question type')
//       }

//       if (
//         !row.difficulty ||
//         !['easy', 'medium', 'hard'].includes(
//           String(row.difficulty)
//         )
//       ) {
//         throw new Error('Invalid difficulty')
//       }

//       if (
//         !Number.isFinite(numberOfQuestions) ||
//         numberOfQuestions < 1
//       ) {
//         throw new Error(
//           'Question count must be greater than 0'
//         )
//       }

//       if (
//         !Number.isFinite(marksPerQuestion) ||
//         marksPerQuestion < 1
//       ) {
//         throw new Error(
//           'Marks per question must be greater than 0'
//         )
//       }

//       return {
//         type: row.type,
//         difficulty: String(row.difficulty),
//         numberOfQuestions,
//         marksPerQuestion,
//       }
//     })

//   return {
//     title,
//     dueDate,
//     questionTypes: parsedTypes,
//     additionalInstructions:
//       typeof additionalInstructions === 'string'
//         ? additionalInstructions
//         : undefined,
//   }
// }

// function toAssignmentResponse(
//   assignment: {
//     _id: unknown
//     title: string
//     dueDate: Date
//     questionTypes: QuestionTypePayload[]
//     createdAt: Date
//     updatedAt: Date
//   },

//   generated: {
//     _id: unknown
//     totalMarks: number
//     sections: unknown[]
//   } | null,

//   includeAnswers: boolean
// ): Assignment {
//   const mapSections = (
//     sections: Array<Record<string, unknown>>
//   ) =>
//     sections.map((section) => ({
//       title: String(section.title),

//       instructions:
//         section.instructions as string | undefined,

//       totalMarks: Number(section.totalMarks),

//       questions: (
//         section.questions as Array<
//           Record<string, unknown>
//         >
//       ).map((q) => ({
//         questionText: String(q.questionText || q.question || ''),

//         difficulty: String(q.difficulty || 'medium'),

//         marks: Number(q.marks || 1),

//         type: String(q.type || 'MCQ'),

//         options:
//           Array.isArray(q.options) ? q.options.map(String) : [],

//         ...(includeAnswers && q.answer
//           ? { answer: String(q.answer) }
//           : {}),
//       })),
//     }))

//   return {
//     _id: String(assignment._id),

//     title: String(assignment.title),

//     dueDate:
//       assignment.dueDate.toISOString(),

//     questionTypes:
//       assignment.questionTypes,

//     createdAt:
//       assignment.createdAt.toISOString(),

//     updatedAt:
//       assignment.updatedAt.toISOString(),

//     generated: generated
//       ? {
//           _id: String(generated._id),

//           totalMarks:
//             generated.totalMarks,

//           sections: mapSections(
//             generated.sections as Array<
//               Record<string, unknown>
//             >
//           ),
//         }
//       : null,
//   }
// }

// function getErrorStatus(
//   error: unknown,
//   message: string
// ): number {
//   if (
//     APICallError.isInstance(error) &&
//     error.statusCode === 429
//   ) {
//     return 429
//   }

//   if (
//     /rate limit|quota exceeded/i.test(
//       message
//     )
//   ) {
//     return 429
//   }

//   if (
//     /API key|unauthorized/i.test(message)
//   ) {
//     return 503
//   }

//   return 400
// }

// export async function POST(request: Request) {
//   try {
//     console.log('[POST /api/assignments] Starting request...');
//     const user = await getAuthUser(request)

//     if (!user) {
//       console.log('[POST /api/assignments] Unauthorized');
//       return NextResponse.json(
//         { error: 'Unauthorized' },
//         { status: 401 }
//       )
//     }

//     if (user.role !== 'teacher') {
//       return NextResponse.json(
//         { error: 'Forbidden' },
//         { status: 403 }
//       )
//     }

//     console.log(`[POST /api/assignments] User verified: ${user.id}. Parsing input...`);
//     const input = parseBody(
//       await request.json()
//     )
//     console.log('[POST /api/assignments] Input parsed and validated successfully.');

//     const dueDate = new Date(input.dueDate)

//     if (Number.isNaN(dueDate.getTime())) {
//       return NextResponse.json(
//         {
//           error:
//             'Due date must be a valid date',
//         },
//         { status: 400 }
//       )
//     }

//     console.log('[POST /api/assignments] Calling Gemini AI to generate assignment...');
//     const generated =
//       await generateAssignment(input)
//     console.log('[POST /api/assignments] AI generation successful.');

//     console.log('[POST /api/assignments] Connecting to database...');
//     await connectDB()
//     console.log('[POST /api/assignments] Database connected. Creating models...');

//     const assignment =
//       await AssignmentModel.create({
//         title: input.title,
//         dueDate,

//         questionTypes:
//           input.questionTypes,

//         createdBy: user.id,
//       })

//     const normalizedSections = Array.isArray(generated.sections)
//       ? generated.sections.map((section: any, index: number) => {
//           const config = input.questionTypes[index] || {};
//           const expectedMarks = config.marksPerQuestion || 1;
//           const expectedType = config.type || 'MCQ';
//           const expectedDifficulty = config.difficulty || 'medium';

//           const questions = Array.isArray(section.questions)
//             ? section.questions.map((q: any) => ({
//                 ...q,
//                 questionText: q.questionText || q.question || '',
//                 difficulty: q.difficulty || expectedDifficulty,
//                 marks: Number(q.marks) || expectedMarks,
//                 type: q.type || expectedType,
//                 options: Array.isArray(q.options) ? q.options : [],
//                 answer: q.answer || '',
//               }))
//             : [];
          
//           const sectionMarks = questions.reduce((sum: number, q: any) => sum + q.marks, 0);
          
//           return {
//             ...section,
//             title: section.title || 'Section',
//             instructions: section.instructions || '',
//             totalMarks: Number(section.totalMarks) || sectionMarks,
//             questions,
//           };
//         })
//       : [];

//     const computedTotalMarks = normalizedSections.reduce(
//       (sum: number, section: any) => sum + section.totalMarks,
//       0
//     );

//     const generatedDoc =
//       await GeneratedAssignment.create({
//         assignmentId: assignment._id,

//         generatedPrompt:
//           generated.prompt,

//         sections: normalizedSections,

//         totalMarks:
//           Number(generated.totalMarks) || computedTotalMarks || 1,

//         generatedBy: user.id,

//         llmProvider: 'nvidia',

//         modelId: generated.modelId,

//         rawResponse: {
//           rawText: generated.rawText,
//           modelId: generated.modelId,
//         },
//       })
//     console.log('[POST /api/assignments] Database records created successfully.');

//     return NextResponse.json(
//       {
//         assignment:
//           toAssignmentResponse(
//             assignment.toObject(),
//             {
//               _id: generatedDoc._id,

//               totalMarks:
//                 generatedDoc.totalMarks,

//               sections:
//                 generatedDoc.sections,
//             },
//             false
//           ),
//       },
//       { status: 201 }
//     )
//   } catch (error) {
//     console.error('[POST /api/assignments] Error occurred:', error);
//     const message = formatAiError(error)

//     const status = getErrorStatus(
//       error,
//       message
//     )

//     return NextResponse.json(
//       {
//         error: message,
//       },
//       {
//         status,
//       }
//     )
//   }
// }

// export async function GET(request: Request) {
//   try {
//     const user = await getAuthUser(request)

//     if (!user) {
//       return NextResponse.json(
//         { error: 'Unauthorized' },
//         { status: 401 }
//       )
//     }

//     await connectDB()

//     const query = user.role === 'student' ? {} : { createdBy: user.id }

//     const assignments =
//       await AssignmentModel.find(query)
//         .sort({
//           createdAt: -1,
//         })
//         .lean()

//     let visibleAssignments = assignments

//     if (user.role === 'student') {
//       const submittedAssignmentIds = await SubmitAssignment.distinct('assignmentId', {
//         studentId: user.id,
//       })

//       const submittedSet = new Set(
//         submittedAssignmentIds.map((id) => String(id))
//       )

//       visibleAssignments = assignments.filter(
//         (assignment) => !submittedSet.has(String(assignment._id))
//       )
//     }

//     const assignmentIds =
//       visibleAssignments.map(
//         (item) => item._id
//       )

//     const generatedList =
//       await GeneratedAssignment.find({
//         assignmentId: {
//           $in: assignmentIds,
//         },
//       }).lean()

//     const generatedByAssignmentId =
//       new Map(
//         generatedList.map((item) => [
//           String(item.assignmentId),
//           item,
//         ])
//       )

//     return NextResponse.json(
//       {
//         assignments:
//           visibleAssignments.map(
//             (assignment) => {
//               const generated =
//                 generatedByAssignmentId.get(
//                   String(assignment._id)
//                 )

//               return toAssignmentResponse(
//                 {
//                   _id: assignment._id,
//                   title: assignment.title,
//                   dueDate:
//                     assignment.dueDate,

//                   questionTypes:
//                     assignment.questionTypes,

//                   createdAt:
//                     assignment.createdAt,

//                   updatedAt:
//                     assignment.updatedAt,
//                 },

//                 generated
//                   ? {
//                       _id: generated._id,

//                       totalMarks:
//                         generated.totalMarks,

//                       sections:
//                         generated.sections,
//                     }
//                   : null,

//                 false
//               )
//             }
//           ),
//       },
//       { status: 200 }
//     )
//   } catch (error) {
//     const message =
//       error instanceof Error
//         ? error.message
//         : 'Failed to fetch assignments'

//     return NextResponse.json(
//       {
//         error: message,
//       },
//       {
//         status: 500,
//       }
//     )
//   }
// }




import { APICallError } from '@ai-sdk/provider'
import { getAuthUser } from '@/lib/auth/session'
import { NextResponse } from 'next/server'
import { generateAssignment } from '@/lib/ai/generate-assignment'
import { formatAiError } from '@/lib/ai/errors'
import { connectDB } from '@/lib/db'
import { Assignment as AssignmentModel } from '@/models/assignment'
import { GeneratedAssignment } from '@/models/generatedAssignment'
import { SubmitAssignment } from '@/models/submitAssignment'

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

type GeneratedQuestion = {
  questionText?: string
  question?: string
  difficulty?: string
  marks?: number
  type?: string
  options?: string[]
  answer?: string
}

type NormalizedQuestion = {
  questionText: string
  difficulty: string
  marks: number
  type: string
  options: string[]
  answer?: string
}

type GeneratedSection = {
  title?: string
  instructions?: string
  totalMarks?: number
  questions?: GeneratedQuestion[]
}

type NormalizedSection = {
  title: string
  instructions: string
  totalMarks: number
  questions: NormalizedQuestion[]
}

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

function getErrorStatus(
  error: unknown,
  message: string
): number {
  if (
    APICallError.isInstance(error) &&
    error.statusCode === 429
  ) {
    return 429
  }

  if (
    /rate limit|quota exceeded/i.test(
      message
    )
  ) {
    return 429
  }

  if (
    /API key|unauthorized/i.test(
      message
    )
  ) {
    return 503
  }

  return 400
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

    console.log(
      '[POST /api/assignments] Generating assignment...'
    )

    const generated =
      await generateAssignment(input)

    console.log(
      '[POST /api/assignments] AI generation successful.'
    )

    await connectDB()

    const assignment =
      await AssignmentModel.create({
        title: input.title,

        dueDate,

        questionTypes:
          input.questionTypes,

        createdBy: user.id,
      })

    const normalizedSections: NormalizedSection[] =
      Array.isArray(
        generated.sections
      )
        ? generated.sections.map(
            (
              section: GeneratedSection,
              index: number
            ) => {
              const config =
                input.questionTypes[
                  index
                ]

              const expectedMarks =
                config?.marksPerQuestion ??
                1

              const expectedType =
                config?.type ?? 'MCQ'

              const expectedDifficulty =
                config?.difficulty ??
                'medium'

              const questions: NormalizedQuestion[] =
                Array.isArray(
                  section.questions
                )
                  ? section.questions.map(
                      (
                        q: GeneratedQuestion
                      ) => ({
                        questionText:
                          q.questionText ||
                          q.question ||
                          '',

                        difficulty:
                          q.difficulty ||
                          expectedDifficulty,

                        marks:
                          Number(
                            q.marks
                          ) ||
                          expectedMarks,

                        type:
                          q.type ||
                          expectedType,

                        options:
                          Array.isArray(
                            q.options
                          )
                            ? q.options
                            : [],

                        answer:
                          q.answer || '',
                      })
                    )
                  : []

              const sectionMarks =
                questions.reduce(
                  (
                    sum,
                    q
                  ) =>
                    sum + q.marks,
                  0
                )

              return {
                title:
                  section.title ||
                  'Section',

                instructions:
                  section.instructions ||
                  '',

                totalMarks:
                  Number(
                    section.totalMarks
                  ) ||
                  sectionMarks,

                questions,
              }
            }
          )
        : []

    const computedTotalMarks =
      normalizedSections.reduce(
        (
          sum,
          section
        ) =>
          sum +
          section.totalMarks,
        0
      )

    const generatedDoc =
      await GeneratedAssignment.create(
        {
          assignmentId:
            assignment._id,

          generatedPrompt:
            generated.prompt,

          sections:
            normalizedSections,

          totalMarks:
            Number(
              generated.totalMarks
            ) ||
            computedTotalMarks ||
            1,

          generatedBy: user.id,

          llmProvider: 'nvidia',

          modelId:
            generated.modelId,

          rawResponse: {
            rawText:
              generated.rawText,

            modelId:
              generated.modelId,
          },
        }
      )

    console.log(
      '[POST /api/assignments] Database records created successfully.'
    )

    return NextResponse.json(
      {
        assignment:
          toAssignmentResponse(
            assignment.toObject(),
            {
              _id:
                generatedDoc._id,

              totalMarks:
                generatedDoc.totalMarks,

              sections:
                generatedDoc.sections as Record<
                  string,
                  unknown
                >[],
            },
            false
          ),
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      '[POST /api/assignments] Error occurred:',
      error
    )

    const message =
      formatAiError(error)

    const status =
      getErrorStatus(
        error,
        message
      )

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
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