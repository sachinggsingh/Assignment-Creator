import mongoose, { Schema } from 'mongoose'
import type {
  IGeneratedAssignment,
  IQuestion,
  ISection,
} from '@/types/type'

/*
CHANGES MADE:
1. Added default values for optional AI-generated fields
2. Removed strict dependency on perfect AI responses
3. Added safe defaults for:
   - difficulty
   - marks
   - type
   - options
4. Added trimming where useful
5. Added default section title + totalMarks
6. Makes schema more AI-friendly and production safe
*/

const QuestionSchema = new Schema<IQuestion>(
  {
    // AI sometimes returns "question" instead of questionText
    // Backend normalization should map it before save
    questionText: {
      type: String,
      required: true,
      trim: true,
    },

    // Default added for AI safety
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
      default: 'medium',
    },

    // Default added
    marks: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    // Default added
    type: {
      type: String,
      required: true,
      enum: [
        'MCQ',
        'Short Answer',
        'Long Answer',
        'True/False',
        'Coding',
        'Essay',
      ],
      default: 'MCQ',
    },

    // Default empty array added
    options: {
      type: [String],
      default: [],
    },

    answer: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
)

const SectionSchema = new Schema<ISection>(
  {
    // Default title added
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Section',
    },

    instructions: {
      type: String,
      trim: true,
      default: '',
    },

    questions: {
      type: [QuestionSchema],
      required: true,
      default: [],
    },

    // Default added
    totalMarks: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
)

const GeneratedAssignmentSchema =
  new Schema<IGeneratedAssignment>(
    {
      assignmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Assignment',
      },

      generatedPrompt: {
        type: String,
        required: true,
      },

      sections: {
        type: [SectionSchema],
        required: true,
        default: [],
      },

      // Default added
      totalMarks: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
      },

      generatedBy: {
        type: String,
        trim: true,
      },

      llmProvider: {
        type: String,
        default: 'gemini',
      },

      modelId: {
        type: String,
        trim: true,
      },

      // Stores original raw AI response
      rawResponse: {
        type: Schema.Types.Mixed,
      },
    },
    {
      timestamps: true,
    }
  )

export const GeneratedAssignment =
  mongoose.models.GeneratedAssignment ||
  mongoose.model<IGeneratedAssignment>(
    'GeneratedAssignment',
    GeneratedAssignmentSchema
  )