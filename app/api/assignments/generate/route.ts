import { NextResponse } from "next/server"

import { assignmentQueue } from "@/lib/bullmq/queue/assignment.queue"

export async function POST(req: Request) {

  try {

    const body = await req.json()

    const {
      title,
      dueDate,
      questionTypes,
      additionalInstructions,
      createdBy,
    } = body

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
      {
        success: false,
      },
      {
        status: 500,
      }
    )
  }
}