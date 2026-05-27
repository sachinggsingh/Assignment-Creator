import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/session'
import { connectDB } from '@/lib/db'
import { Assignment as AssignmentModel } from '@/models/assignment'
import { GeneratedAssignment } from '@/models/generatedAssignment'
import type { Assignment, QuestionTypePayload } from '@/types/type'

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
    sections: unknown[]
  } | null
): Assignment {
  const mapSections = (sections: Array<Record<string, unknown>>) =>
    sections.map((section) => ({
      title: String(section.title),
      instructions: section.instructions as string | undefined,
      totalMarks: Number(section.totalMarks),
      questions: (section.questions as Array<Record<string, unknown>>).map((q) => ({
        questionText: String(q.questionText),
        difficulty: String(q.difficulty),
        marks: Number(q.marks),
        type: String(q.type),
        options: q.options as string[] | undefined,
      })),
    }))

  return {
    _id: String(assignment._id),
    title: assignment.title,
    dueDate: assignment.dueDate.toISOString(),
    questionTypes: assignment.questionTypes,
    // additionalInstructions: assignment.additionalInstructions,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
    generated: generated
      ? {
        _id: String(generated._id),
        totalMarks: generated.totalMarks,
        sections: mapSections(generated.sections as Array<Record<string, unknown>>),
      }
      : null,
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(_request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing assignment ID' }, { status: 400 })
    }

    await connectDB()

    const query = user.role === 'student' ? { _id: id } : { _id: id, createdBy: user.id }
    const assignment = await AssignmentModel.findOne(query).lean()
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const generated = await GeneratedAssignment.findOne({ assignmentId: assignment._id }).lean()

    return NextResponse.json(
      {
        assignment: toAssignmentResponse(
          {
            _id: assignment._id,
            title: assignment.title,
            dueDate: assignment.dueDate,
            questionTypes: assignment.questionTypes,
            createdAt: assignment.createdAt,
            updatedAt: assignment.updatedAt,
          },
          generated
            ? {
              _id: generated._id,
              totalMarks: generated.totalMarks,
              sections: generated.sections,
            }
            : null
        ),
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch assignment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
