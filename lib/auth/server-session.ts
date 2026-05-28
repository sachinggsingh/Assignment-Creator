import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth/jwt'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { toAuthUser, type AuthUser } from '@/lib/auth/session'

export async function getServerUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
  if (!token) return null

  const payload = await verifyAuthToken(token)
  if (!payload) return null

  await connectDB()
  const user = await User.findById(payload.sub).select('email name role').lean()
  if (!user) return null

  return toAuthUser(user)
}
