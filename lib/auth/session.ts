import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getTokenFromRequest, signAuthToken, verifyAuthToken } from '@/lib/auth/jwt'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import type { UserRole } from '@/types/type'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: UserRole | null
}

export function toAuthUser(user: {
  _id: unknown
  email: string
  name: string
  role?: UserRole | null
}): AuthUser {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role ?? null,
  }
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function createSessionResponse(user: AuthUser) {
  const token = await signAuthToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })

  const response = NextResponse.json({ user, token })
  setAuthCookie(response, token)
  return response
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const token = getTokenFromRequest(request)
  if (!token) return null

  const payload = await verifyAuthToken(token)
  if (!payload) return null

  await connectDB()
  const user = await User.findById(payload.sub).select('email name role').lean()
  if (!user) return null

  return toAuthUser(user)
}

export async function requireAuthUser(request: Request): Promise<AuthUser | null> {
  return getAuthUser(request)
}
