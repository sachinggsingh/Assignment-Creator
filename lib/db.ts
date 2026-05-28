import mongoose from 'mongoose'
import type { MongooseCache } from '../types/type'

const globalCache = globalThis as typeof globalThis & {
  mongoose?: MongooseCache
}

const cached: MongooseCache = globalCache.mongoose ?? {
  conn: null,
  promise: null,
}

globalCache.mongoose = cached

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI

  if (!MONGODB_URI) {
    throw new Error('Please define MONGODB_URI')
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongooseInstance) => {
      return mongooseInstance.connection
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
