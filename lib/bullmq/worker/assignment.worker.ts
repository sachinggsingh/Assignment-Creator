import { Worker } from "bullmq"
import IORedis from "ioredis"
import { connectDB } from "../../db"
import { Assignment } from "../../../models/assignment"
import { GeneratedAssignment } from "../../../models/generatedAssignment"
import { generateAssignment } from "../../ai/generate-assignment"
import { emailQueue } from "../queue/email.queue"

type GeneratedQuestion = {
  questionText?: string
  question?: string
  difficulty?: string
  marks?: number
  type?: string
  options?: string[]
  answer?: string
}

type GeneratedSection = {
  title?: string
  instructions?: string
  totalMarks?: number
  questions?: GeneratedQuestion[]
}

type NormalizedQuestion = {
  questionText: string
  difficulty: string
  marks: number
  type: string
  options: string[]
  answer: string
}

type NormalizedSection = {
  title: string
  instructions: string
  totalMarks: number
  questions: NormalizedQuestion[]
}

const worker = new Worker(
  "assignment-generation",
  async (job) => {
    console.log(`[Worker] Job ${job.id} started`)
    try {
      await connectDB()
      const {
        title,
        dueDate,
        questionTypes,
        additionalInstructions,
        createdBy,
      } = job.data

      console.log("[Worker] Generating assignment via AI...")
      await job.updateProgress(10)

      const generated = await generateAssignment({
        title,
        dueDate,
        questionTypes,
        additionalInstructions,
      })

      console.log("[Worker] AI generation complete")
      await job.updateProgress(60)

      // Create the base assignment record
      const assignment = await Assignment.create({
        title,
        dueDate: new Date(dueDate),
        questionTypes,
        createdBy,
      })

      console.log("[Worker] Assignment record created:", assignment._id)
      await job.updateProgress(70)

      // Normalize sections (same logic as the sync route)
      const normalizedSections: NormalizedSection[] = Array.isArray(generated.sections)
        ? generated.sections.map((section: GeneratedSection, index: number) => {
            const config = questionTypes[index]
            const expectedMarks = config?.marksPerQuestion ?? 1
            const expectedType = config?.type ?? "MCQ"
            const expectedDifficulty = config?.difficulty ?? "medium"

            const questions: NormalizedQuestion[] = Array.isArray(section.questions)
              ? section.questions.map((q: GeneratedQuestion) => ({
                  questionText: q.questionText || q.question || "",
                  difficulty: q.difficulty || expectedDifficulty,
                  marks: Number(q.marks) || expectedMarks,
                  type: q.type || expectedType,
                  options: Array.isArray(q.options) ? q.options : [],
                  answer: q.answer || "",
                }))
              : []

            const sectionMarks = questions.reduce((sum, q) => sum + q.marks, 0)

            return {
              title: section.title || "Section",
              instructions: section.instructions || "",
              totalMarks: Number(section.totalMarks) || sectionMarks,
              questions,
            }
          })
        : []

      const computedTotalMarks = normalizedSections.reduce(
        (sum, section) => sum + section.totalMarks,
        0
      )

      // Create the GeneratedAssignment record
      const generatedDoc = await GeneratedAssignment.create({
        assignmentId: assignment._id,
        generatedPrompt: generated.prompt,
        sections: normalizedSections,
        totalMarks: Number(generated.totalMarks) || computedTotalMarks || 1,
        generatedBy: createdBy,
        llmProvider: "gemini",
        modelId: generated.modelId,
        rawResponse: {
          rawText: generated.rawText,
          modelId: generated.modelId,
        },
      })

      console.log("[Worker] GeneratedAssignment record created:", generatedDoc._id)
      await job.updateProgress(90)

      // Enqueue email notification
      await emailQueue.add(
        "assignment-created-email",
        {
          email: "teacher@gmail.com",
          assignmentTitle: assignment.title,
        }
      )

      await job.updateProgress(100)
      console.log("[Worker] Job completed successfully")

      // Return data so it can be retrieved via job.returnvalue
      return {
        assignmentId: String(assignment._id),
        generatedId: String(generatedDoc._id),
      }
    } catch (error) {
      console.error("[Worker] Job failed:", error)
      throw error
    }
  },
  {
    connection: new IORedis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }),
    concurrency: 3,
  }
)

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed`)
})

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message)
})

worker.on("error", (err) => {
  console.error("[Worker] Worker error:", err)
})