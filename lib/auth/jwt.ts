import { SignJWT, jwtVerify } from 'jose'
import type { UserRole } from '@/types/type'

export const AUTH_COOKIE_NAME = 'auth_token'

export type JwtPayload = {
  sub: string
  email: string
  name: string
  role: UserRole | null
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  return new TextEncoder().encode(secret)
}

export async function signAuthToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyAuthToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const sub = payload.sub
    const email = payload.email
    const name = payload.name
    const role = payload.role

    if (typeof sub !== 'string' || typeof email !== 'string' || typeof name !== 'string') {
      return null
    }

    return {
      sub,
      email,
      name,
      role: role === 'teacher' || role === 'student' ? role : null,
    }
  } catch {
    return null
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) return token
  }

  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null

  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`))

  if (!match) return null
  return decodeURIComponent(match.slice(AUTH_COOKIE_NAME.length + 1))
}
