import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/session'
import { assignmentQueue } from '@/lib/bullmq/queue/assignment.queue'
import { connectDB } from '@/lib/db'
import { Assignment as AssignmentModel } from '@/models/assignment'
import { GeneratedAssignment } from '@/models/generatedAssignment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type JobResult = {
  assignmentId?: string
  generatedId?: string
  assignment?: {
    _id: string
    title: string
    dueDate: string
    questionTypes: unknown[]
    createdAt: string
    updatedAt: string
    generated: {
      _id: string
      totalMarks: number
      sections: unknown[]
    }
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    const job = await assignmentQueue.getJob(jobId)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const state = await job.getState()
    const progress =
      typeof job.progress === 'number' ? job.progress : Number(job.progress) || 0

    if (state === 'completed') {
      const result = job.returnvalue as JobResult | undefined
      if (!result) {
        return NextResponse.json({ error: 'Job completed but returned no result' }, { status: 500 })
      }

      if (result.assignment) {
        return NextResponse.json(
          {
            state: 'completed',
            progress: 100,
            assignment: result.assignment,
          },
          { status: 200 }
        )
      }

      await connectDB()

      const assignment = await AssignmentModel.findById(result.assignmentId).lean()
      const generatedDoc = await GeneratedAssignment.findById(result.generatedId).lean()

      if (!assignment || !generatedDoc) {
        return NextResponse.json({ error: 'Assignment records not found in database' }, { status: 500 })
      }

      return NextResponse.json(
        {
          state: 'completed',
          progress: 100,
          assignment: {
            ...assignment,
            _id: assignment._id.toString(),
            dueDate: assignment.dueDate.toISOString(),
            createdAt: assignment.createdAt.toISOString(),
            updatedAt: assignment.updatedAt.toISOString(),
            generated: {
              _id: generatedDoc._id.toString(),
              totalMarks: generatedDoc.totalMarks,
              sections: generatedDoc.sections,
            },
          },
        },
        { status: 200 }
      )
    }

    if (state === 'failed') {
      return NextResponse.json(
        {
          state: 'failed',
          progress,
          error: job.failedReason || 'Job failed',
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        state,
        progress,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[GET /api/assignments/job] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
