import { NextResponse } from "next/server"

import { assignmentQueue } from "@/lib/bullmq/queue/assignment.queue"

export async function GET(
  req: Request,
  context: {
    params: Promise<{
      jobId: string
    }>
  }
) {

  try {

    const { jobId } = await context.params

    const job =
      await assignmentQueue.getJob(jobId)

    if (!job) {

      return NextResponse.json({
        success: false,
        message: "Job not found",
      })
    }

    const state = await job.getState()

    return NextResponse.json({
      success: true,
      state,
      progress: job.progress,
      failedReason: job.failedReason,
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