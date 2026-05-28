import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerUser } from "@/lib/auth/server-session"
import { assignmentQueue } from "@/lib/bullmq/queue/assignment.queue"

const generateAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  dueDate: z.string().min(1, "Due date is required"),
  questionTypes: z.array(
    z.object({
      type: z.string().min(1),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      numberOfQuestions: z.number().min(1),
      marksPerQuestion: z.number().min(1)
    })
  ).min(1, "At least one question type is required"),
  additionalInstructions: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    if (user.role !== "teacher") {
      return NextResponse.json(
        { success: false, message: "Forbidden: Only teachers can generate assignments" },
        { status: 403 }
      )
    }

    const body = await req.json()

    const validatedData = generateAssignmentSchema.safeParse(body)

    if (!validatedData.success) {
      return NextResponse.json(
        { success: false, message: "Invalid request data", errors: validatedData.error },
        { status: 400 }
      )
    }

    const {
      title,
      dueDate,
      questionTypes,
      additionalInstructions,
    } = validatedData.data

    const createdBy = user.id

    const job = await assignmentQueue.add(
      "generate-assignment",
      {
        title,
        dueDate,
        questionTypes,
        additionalInstructions,
        createdBy,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    )

    return NextResponse.json({
      success: true,
      message: "Assignment generation started",
      jobId: job.id,
    })

  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { success: false },
      { status: 500 }
    )
  }
}