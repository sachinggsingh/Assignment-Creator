import mongoose, { Schema } from 'mongoose'
import type { IUser } from '@/types/type'

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['teacher', 'student'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

export const User =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
