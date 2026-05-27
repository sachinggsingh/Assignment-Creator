import mongoose, { Schema } from 'mongoose'
import type { IAssignment, IQuestionConfig } from '@/types/type'

const QuestionConfigSchema = new Schema<IQuestionConfig>(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      enum: ['MCQ', 'Short Answer', 'Long Answer', 'True/False', 'Coding', 'Essay'],
    },

    difficulty: {
      type: String,
      required: true,
      enum: ['easy', 'medium', 'hard'],
    },

    numberOfQuestions: {
      type: Number,
      required: true,
      min: 1,
    },

    marksPerQuestion: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
)

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    questionTypes: {
      type: [QuestionConfigSchema],
      required: true,
      validate: {
        validator: (value: IQuestionConfig[]) => value.length > 0,
        message: 'At least one question type is required',
      },
    },

    createdBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

export const Assignment =
  mongoose.models.Assignment ||
  mongoose.model<IAssignment>('Assignment', AssignmentSchema)