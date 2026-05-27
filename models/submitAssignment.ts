import mongoose, { Schema } from 'mongoose'
import type { ISubmitAssignment, IQuestionFeedback } from '@/types/type'

const QuestionFeedbackSchema = new Schema<IQuestionFeedback>(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    marksObtained: {
      type: Number,
      required: true,
      min: 0,
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    studentAnswerText: {
      type: String,
      trim: true,
      default: '',
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
)

const SubmitAssignmentSchema = new Schema<ISubmitAssignment>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    studentId: {
      type: String,
      required: true,
      trim: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    pdfUrl: {
      type: String,
      required: true,
      trim: true,
    },
    pageImages: {
      type: [String],
      required: true,
      default: [],
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
    },
    questionsFeedback: {
      type: [QuestionFeedbackSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'graded'],
      default: 'graded',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

export const SubmitAssignment =
  mongoose.models.SubmitAssignment ||
  mongoose.model<ISubmitAssignment>('SubmitAssignment', SubmitAssignmentSchema)
