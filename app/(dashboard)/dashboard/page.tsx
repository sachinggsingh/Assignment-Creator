import { getServerUser } from '@/lib/auth/server-session'
import { redirect } from 'next/navigation'
import { connectDB } from '@/lib/db'
import { Assignment } from '@/models/assignment'
import { GeneratedAssignment } from '@/models/generatedAssignment'
import { SubmitAssignment } from '@/models/submitAssignment'

export default async function DashboardPage() {
  const user = await getServerUser()
  if (!user) {
    redirect('/sign-in')
  }

  await connectDB()

  let stats = []
  
  if (user.role === 'teacher') {
    // Teacher stats
    const assignments = await Assignment.find({ createdBy: user.id }).lean()
    const assignmentIds = assignments.map(a => a._id)
    
    const generatedAssignments = await GeneratedAssignment.find({
      assignmentId: { $in: assignmentIds }
    }).lean()

    let totalMarks = 0
    let totalQuestions = 0

    generatedAssignments.forEach((gen) => {
      totalMarks += (gen.totalMarks || 0)
      if (Array.isArray(gen.sections)) {
        gen.sections.forEach((sec: any) => {
          if (Array.isArray(sec.questions)) {
            totalQuestions += sec.questions.length
          }
        })
      }
    })

    stats = [
      { label: "Papers Created", value: assignments.length.toString() },
      { label: "Total Questions", value: totalQuestions.toString() },
      { label: "Total Marks", value: totalMarks.toString() },
    ]
  } else if (user.role === 'student') {
    // Student stats
    const submissions = await SubmitAssignment.find({ studentId: user.id }).lean()
    const totalPapers = submissions.length
    
    let totalScore = 0
    let totalPossibleMarks = 0
    let totalQuestions = 0

    submissions.forEach(sub => {
      totalScore += (sub.score || 0)
      totalPossibleMarks += (sub.totalMarks || 0)
      if (Array.isArray(sub.questionsFeedback)) {
        totalQuestions += sub.questionsFeedback.length
      }
    })

    const overallPercentage = totalPossibleMarks > 0 
      ? ((totalScore / totalPossibleMarks) * 100).toFixed(1) + '%' 
      : '0%'

    stats = [
      { label: "Total Papers", value: totalPapers.toString() },
      { label: "Total Questions", value: totalQuestions.toString() },
      { label: "Total Marks", value: totalScore.toString() },
      { label: "Overall %", value: overallPercentage },
    ]
  } else {
    stats = [
      { label: "No Role Assigned", value: "-" }
    ]
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Overview</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back, {user.name}. Manage assessments, review progress, and create new work from here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}