import { NextResponse } from 'next/server'
import { signAuthToken } from '@/lib/auth/jwt'
import {
  getAuthUser,
  setAuthCookie,
  toAuthUser,
} from '@/lib/auth/session'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { isUserRole } from '@/lib/auth-role'

export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const role = body?.role

    if (!isUserRole(role)) {
      return NextResponse.json({ error: 'Role must be teacher or student' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findByIdAndUpdate(
      authUser.id,
      { role },
      { new: true }
    ).lean()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updated = toAuthUser(user)
    const token = await signAuthToken({
      sub: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
    })

    const response = NextResponse.json({ user: updated, token })
    setAuthCookie(response, token)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update role'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
