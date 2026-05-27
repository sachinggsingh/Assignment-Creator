import type { Document, Types } from 'mongoose'

export type UserRole = 'teacher' | 'student'

export interface IUser extends Document {
  name: string
  email: string
  passwordHash: string
  role?: UserRole | null
  createdAt: Date
  updatedAt: Date
}

export type AuthUserResponse = {
  id: string
  email: string
  name: string
  role: UserRole | null
}

export const ASSIGNMENT_QUESTION_TYPES = [
  'MCQ',
  'Short Answer',
  'Long Answer',
  'True/False',
] as const

export type AssignmentQuestionType = (typeof ASSIGNMENT_QUESTION_TYPES)[number]

export type QuestionTypePayload = {
  type: AssignmentQuestionType | string
  difficulty?: DifficultyLevel | string
  numberOfQuestions: number
  marksPerQuestion: number
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export type GeneratedSubPart = {
  label: string
  questionText: string
  marks: number
}

export type GeneratedQuestion = {
  questionText: string
  difficulty: DifficultyLevel | string
  marks: number
  type: string
  options?: string[]
  answer?: string
  subParts?: GeneratedSubPart[]
}

export type GeneratedSection = {
  title: string
  instructions?: string
  totalMarks: number
  questions: GeneratedQuestion[]
}

export type GenerateAssignmentInput = {
  title: string
  dueDate: string
  questionTypes: QuestionTypePayload[]
  additionalInstructions?: string
}

export type Assignment = {
  _id: string
  title: string
  dueDate: string
  questionTypes: QuestionTypePayload[]
  createdAt: string
  updatedAt: string
  generated?: {
    _id: string
    totalMarks: number
    sections: GeneratedSection[]
  } | null
}

export type CreateAssignmentPayload = GenerateAssignmentInput

export type AssignmentStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface AssignmentState {
  status: AssignmentStatus
  error: string | null
  createdAssignment: Assignment | null
}

export interface IQuestionConfig {
  type: string,
    difficulty?: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number
  marksPerQuestion: number
}

export interface IAssignment extends Document {
  title: string
  dueDate: Date
  questionTypes: IQuestionConfig[]
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface IQuestion {
  questionText: string
  difficulty: DifficultyLevel
  marks: number
  type: string
  options?: string[]
  answer?: string
}

export interface ISection {
  title: string
  instructions?: string
  questions: IQuestion[]
  totalMarks: number
}

export interface IGeneratedAssignment extends Document {
  assignmentId?: Types.ObjectId
  generatedPrompt: string
  sections: ISection[]
  totalMarks: number
  generatedBy?: string
  llmProvider?: string
  modelId?: string
  rawResponse?: unknown
  createdAt: Date
  updatedAt: Date
}

export interface MongooseCache {
  conn: import('mongoose').Connection | null
  promise: Promise<import('mongoose').Connection> | null
}

export interface IQuestionFeedback {
  questionText: string
  marksObtained: number
  maxMarks: number
  studentAnswerText: string
  feedback: string
}

export interface ISubmitAssignment extends Document {
  assignmentId: Types.ObjectId
  studentId: string
  studentName: string
  pdfUrl: string
  pageImages: string[]
  score: number
  totalMarks: number
  feedback: string
  questionsFeedback: IQuestionFeedback[]
  status: 'pending' | 'graded'
  createdAt: Date
  updatedAt: Date
}
