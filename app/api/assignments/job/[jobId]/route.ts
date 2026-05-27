import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/session'
import { assignmentQueue } from '@/lib/bullmq/queue/assignment.queue'
import { connectDB } from '@/lib/db'
import { Assignment as AssignmentModel } from '@/models/assignment'
import { GeneratedAssignment } from '@/models/generatedAssignment'

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
    const progress = job.progress

    if (state === 'completed') {
      const result = job.returnvalue
      if (!result) {
         return NextResponse.json({ error: 'Job completed but returned no result' }, { status: 500 })
      }

      await connectDB()

      const assignment = await AssignmentModel.findById(result.assignmentId).lean()
      const generatedDoc = await GeneratedAssignment.findById(result.generatedId).lean()

      if (!assignment || !generatedDoc) {
        return NextResponse.json({ error: 'Assignment records not found in database' }, { status: 500 })
      }

      // Format response exactly like the original sync POST endpoint
      return NextResponse.json(
        {
          state: 'completed',
          assignment: {
            ...assignment,
            _id: assignment._id.toString(),
            generated: {
              _id: generatedDoc._id.toString(),
              totalMarks: generatedDoc.totalMarks,
              sections: generatedDoc.sections,
            }
          }
        },
        { status: 200 }
      )
    } else if (state === 'failed') {
      return NextResponse.json(
        {
          state: 'failed',
          error: job.failedReason || 'Job failed',
        },
        { status: 200 }
      )
    } else {
      // Active, waiting, delayed, etc.
      return NextResponse.json(
        {
          state,
          progress,
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('[GET /api/assignments/job] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
