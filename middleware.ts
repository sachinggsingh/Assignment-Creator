import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth/jwt'

const protectedRoutes = [
  '/dashboard',
  '/create-assessments',
  '/attend-assessments',
  '/result',
  '/select-role',
]

const authEntryRoutes = ['/sign-in', '/sign-up']

function getToken(request: NextRequest): string | null {
  const bearer = request.headers.get('authorization')
  if (bearer?.startsWith('Bearer ')) {
    const token = bearer.slice(7).trim()
    if (token) return token
  }

  return request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null
}

function isProtectedPath(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

function isAuthEntryPath(pathname: string) {
  return authEntryRoutes.includes(pathname)
}

function isProtectedApiPath(pathname: string) {
  if (pathname.startsWith('/api/auth/')) return false
  return pathname.startsWith('/api/assignments')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = getToken(request)
  const payload = token ? await verifyAuthToken(token) : null
  const isAuthenticated = Boolean(payload)

  if (isProtectedApiPath(pathname) && !isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (isProtectedPath(pathname) && !isAuthenticated) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(signInUrl)
  }

  if (isAuthEntryPath(pathname) && isAuthenticated) {
    const target = payload?.role ? '/dashboard' : '/select-role'
    return NextResponse.redirect(new URL(target, request.url))
  }

  if (pathname === '/select-role' && isAuthenticated && payload?.role) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|woff2?|ico)).*)',
    '/api/(.*)',
  ],
}
